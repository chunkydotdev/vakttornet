/**
 * Cloudflare Worker implementing the leaderboard contract in ./api.ts.
 * Plain fetch handler — no framework. Storage: D1 (see ../schema.sql).
 */
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  type ApiError,
  type GetScoresResponse,
  type LeaderboardEntry,
  type SubmitScoreResponse,
} from "./api";
import {
  buildContentDerived,
  ENDLESS_BOARD_ID,
  matchOrigin,
  validateSubmit,
} from "./validation";

export interface Env {
  DB: D1Database;
  /** comma-separated list of allowed CORS origins (no wildcards) */
  ALLOWED_ORIGINS: string;
}

/** Per-level caps, computed once from real game content at module init. */
const derived = buildContentDerived();

/** Fixed salt so IP hashes are stable but raw IPs are never stored. */
const IP_HASH_SALT = "vakttornet-leaderboard-salt-v1";
/** Accepted submissions per IP-hash per minute before 429. */
const RATE_LIMIT_PER_MINUTE = 6;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = matchOrigin(
      request.headers.get("Origin"),
      env.ALLOWED_ORIGINS,
    );
    if (!origin) {
      return json(403, { ok: false, error: "forbidden-origin" } satisfies ApiError);
    }
    const cors: Record<string, string> = {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/scores") {
      return json(404, { ok: false, error: "not-found" } satisfies ApiError, cors);
    }

    if (request.method === "GET") {
      return getScores(url, env, cors);
    }
    if (request.method === "POST") {
      return postScore(request, env, cors);
    }
    return json(
      405,
      { ok: false, error: "method-not-allowed" } satisfies ApiError,
      { ...cors, Allow: "GET, POST, OPTIONS" },
    );
  },
} satisfies ExportedHandler<Env>;

async function getScores(
  url: URL,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const level = url.searchParams.get("level");
  if (!level) {
    return json(400, { ok: false, error: "bad-request" } satisfies ApiError, cors);
  }
  if (!derived.has(level)) {
    return json(400, { ok: false, error: "unknown-level" } satisfies ApiError, cors);
  }

  let limit = DEFAULT_LIMIT;
  const limitParam = url.searchParams.get("limit");
  if (limitParam !== null) {
    const n = Number(limitParam);
    if (!Number.isInteger(n) || n < 1) {
      return json(400, { ok: false, error: "bad-request" } satisfies ApiError, cors);
    }
    limit = Math.min(n, MAX_LIMIT);
  }

  // Endless ranks by waves (score) first, trees (vardtrad) as the tiebreak —
  // the mirror of the campaign ordering. Both clauses are fixed literals.
  const orderBy =
    level === ENDLESS_BOARD_ID
      ? "score DESC, vardtrad DESC, created_at ASC, id ASC"
      : "vardtrad DESC, score DESC, created_at ASC, id ASC";

  const { results } = await env.DB.prepare(
    `SELECT name, vardtrad, score, created_at FROM scores
     WHERE level_id = ?1
     ORDER BY ${orderBy}
     LIMIT ?2`,
  )
    .bind(level, limit)
    .all<{ name: string; vardtrad: number; score: number; created_at: string }>();

  const entries: LeaderboardEntry[] = results.map((row) => ({
    name: row.name,
    vardtrad: row.vardtrad,
    score: row.score,
    createdAt: sqliteToIso(row.created_at),
  }));

  return json(
    200,
    { ok: true, levelId: level, entries } satisfies GetScoresResponse,
    cors,
  );
}

async function postScore(
  request: Request,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: "bad-request" } satisfies ApiError, cors);
  }

  const result = validateSubmit(body, derived);
  if (!result.ok) {
    return json(400, { ok: false, error: result.error } satisfies ApiError, cors);
  }
  const { levelId, name, vardtrad, score } = result.value;

  // Rate limit: hashed IP, never the raw address.
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await sha256Hex(IP_HASH_SALT + ip);
  const minute = new Date().toISOString().slice(0, 16); // "2026-06-12T18:04"
  const counted = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM submissions_log WHERE ip_hash = ?1 AND minute = ?2",
  )
    .bind(ipHash, minute)
    .first<{ n: number }>();
  if ((counted?.n ?? 0) > RATE_LIMIT_PER_MINUTE) {
    return json(429, { ok: false, error: "rate-limited" } satisfies ApiError, cors);
  }

  const inserted = await env.DB.prepare(
    `INSERT INTO scores (level_id, name, vardtrad, score)
     VALUES (?1, ?2, ?3, ?4)
     RETURNING created_at`,
  )
    .bind(levelId, name, vardtrad, score)
    .first<{ created_at: string }>();
  if (!inserted) {
    return json(500, { ok: false, error: "internal" } satisfies ApiError, cors);
  }

  await env.DB.prepare(
    "INSERT INTO submissions_log (ip_hash, minute) VALUES (?1, ?2)",
  )
    .bind(ipHash, minute)
    .run();

  // 1-based rank = rows strictly better under the board's ordering, plus 1.
  // Endless mirrors campaign: waves (score) first, then trees (vardtrad).
  const betterThan =
    levelId === ENDLESS_BOARD_ID
      ? "score > ?3 OR (score = ?3 AND vardtrad > ?2) OR (score = ?3 AND vardtrad = ?2 AND created_at < ?4)"
      : "vardtrad > ?2 OR (vardtrad = ?2 AND score > ?3) OR (vardtrad = ?2 AND score = ?3 AND created_at < ?4)";
  const better = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM scores
     WHERE level_id = ?1 AND (${betterThan})`,
  )
    .bind(levelId, vardtrad, score, inserted.created_at)
    .first<{ n: number }>();
  const rank = (better?.n ?? 0) + 1;

  return json(201, { ok: true, rank } satisfies SubmitScoreResponse, cors);
}

/** sqlite datetime('now') → ISO 8601 ("2026-06-12 18:04:09" → "2026-06-12T18:04:09Z"). */
function sqliteToIso(createdAt: string): string {
  if (createdAt.includes("T")) return createdAt;
  return `${createdAt.replace(" ", "T")}Z`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
