/**
 * Pure validation + content-derived caps for the leaderboard Worker.
 * NO Worker/DOM types in this module — it must run under plain node/vitest.
 *
 * Anti-cheat is best-effort: we can't verify a run server-side, but we can
 * reject submissions that are impossible given the actual game content
 * (more vårdträd than buildable tiles, scores beyond any winnable run).
 */
import { buildContent } from "@vakttornet/content";
import { NAME_PATTERN, type SubmitScoreRequest } from "./api";

/** Margin multiplier on the theoretical max score — generous on purpose. */
const SCORE_CEILING_MARGIN = 3;

export interface LevelCaps {
  /** number of buildable "." tiles on the level map */
  vardtradCap: number;
  /** generous upper bound on any legitimate final score for the level */
  scoreCeiling: number;
}

/** levelId → caps, derived from the real content bundle. */
export type ContentDerived = ReadonlyMap<string, LevelCaps>;

/**
 * Precompute per-level caps from the content bundle. Called once at module
 * init by the Worker; tests call it directly.
 */
export function buildContentDerived(): ContentDerived {
  const content = buildContent();
  const bountyByEnemy = new Map(
    content.enemies.map((e) => [e.id, e.bounty] as const),
  );

  // Best possible extra starting lives from meta upgrades (Stugvärme).
  const maxExtraLives = content.metaUpgrades
    .filter((u) => u.effect.kind === "startLives")
    .reduce((sum, u) => sum + u.maxRank * u.effect.value, 0);

  const derived = new Map<string, LevelCaps>();
  for (const level of content.levels) {
    const vardtradCap = countBuildableTiles(level.map);

    const totalBounty = level.waves.reduce(
      (sum, wave) =>
        sum +
        wave.entries.reduce(
          (s, entry) =>
            s + entry.count * (bountyByEnemy.get(entry.enemyTypeId) ?? 0),
          0,
        ),
      0,
    );
    const waveBonus =
      level.waves.length *
      content.globals.waveClearBonusPerWave *
      level.waves.length;
    const winBonus =
      (level.startLives + maxExtraLives) * content.globals.winBonusPerLife;

    derived.set(level.id, {
      vardtradCap,
      scoreCeiling: Math.ceil(
        SCORE_CEILING_MARGIN * (totalBounty + waveBonus + winBonus),
      ),
    });
  }
  return derived;
}

/** Buildable tiles are "." map chars (water "~", blocks "#", path tiles are not). */
export function countBuildableTiles(map: readonly string[]): number {
  let n = 0;
  for (const row of map) {
    for (const ch of row) {
      if (ch === ".") n++;
    }
  }
  return n;
}

export type ValidationResult =
  | { ok: true; value: SubmitScoreRequest }
  | {
      ok: false;
      error: "bad-request" | "invalid-name" | "unknown-level" | "out-of-bounds";
    };

/**
 * Validate a POST /api/scores body against the contract and the
 * content-derived caps. Returns the cleaned (name-trimmed) request on success.
 */
export function validateSubmit(
  body: unknown,
  derived: ContentDerived,
): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "bad-request" };
  }
  const { levelId, name, vardtrad, score } = body as Record<string, unknown>;

  if (typeof name !== "string" || !NAME_PATTERN.test(name.trim())) {
    return { ok: false, error: "invalid-name" };
  }

  if (typeof levelId !== "string" || !derived.has(levelId)) {
    return { ok: false, error: "unknown-level" };
  }
  const caps = derived.get(levelId)!;

  if (
    typeof vardtrad !== "number" ||
    !Number.isInteger(vardtrad) ||
    vardtrad < 0 ||
    vardtrad > caps.vardtradCap
  ) {
    return { ok: false, error: "out-of-bounds" };
  }

  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > caps.scoreCeiling
  ) {
    return { ok: false, error: "out-of-bounds" };
  }

  return {
    ok: true,
    value: { levelId, name: name.trim(), vardtrad, score },
  };
}

/**
 * CORS origin matcher. `allowedOrigins` is the comma-separated env var.
 * Returns the matched origin (to echo back) or null. Exact string match —
 * no wildcards, ever.
 */
export function matchOrigin(
  origin: string | null,
  allowedOrigins: string,
): string | null {
  if (!origin) return null;
  const allowed = allowedOrigins
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return allowed.includes(origin) ? origin : null;
}

export interface RankableEntry {
  vardtrad: number;
  score: number;
  /** ISO or sqlite datetime — both compare correctly as strings */
  createdAt: string;
}

/**
 * Contract ordering: vardtrad DESC, score DESC, createdAt ASC (earlier
 * submission wins ties). Negative = `a` ranks better (sorts first).
 */
export function compareEntries(a: RankableEntry, b: RankableEntry): number {
  if (a.vardtrad !== b.vardtrad) return b.vardtrad - a.vardtrad;
  if (a.score !== b.score) return b.score - a.score;
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}
