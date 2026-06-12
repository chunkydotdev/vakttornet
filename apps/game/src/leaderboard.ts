/**
 * Leaderboard client — talks to the leaderboard Worker over the frozen
 * contract in `@vakttornet/leaderboard/api` (types only, no Worker code).
 *
 * Configuration: `VITE_LEADERBOARD_URL` is the Worker base URL. When it is
 * unset the feature is OFF — callers must check `leaderboardEnabled()` and
 * hide every leaderboard surface (title button, win-screen submit form).
 * Calling the API while unconfigured throws, by design.
 */
import {
  DEFAULT_LIMIT,
  type GetScoresResponse,
  type SubmitScoreRequest,
  type SubmitScoreResponse,
} from "@vakttornet/leaderboard/api";

const FETCH_TIMEOUT_MS = 5000;

const baseUrl: string | undefined = import.meta.env.VITE_LEADERBOARD_URL;

export function leaderboardEnabled(): boolean {
  return typeof baseUrl === "string" && baseUrl.length > 0;
}

/**
 * Thrown on any failed call. `code` is the ApiError machine code when the
 * Worker answered (invalid-name | unknown-level | out-of-bounds |
 * rate-limited | bad-request), or "network" when it never did (offline,
 * timeout, non-JSON response).
 */
export class LeaderboardError extends Error {
  constructor(readonly code: string) {
    super(`leaderboard: ${code}`);
    this.name = "LeaderboardError";
  }
}

function endpoint(path: string): string {
  if (!baseUrl) throw new LeaderboardError("not-configured");
  return baseUrl.replace(/\/+$/, "") + path;
}

function isOk(data: unknown): data is { ok: true } {
  return typeof data === "object" && data !== null && (data as { ok?: unknown }).ok === true;
}

function errorCode(data: unknown): string {
  if (typeof data === "object" && data !== null) {
    const code = (data as { error?: unknown }).error;
    if (typeof code === "string") return code;
  }
  return "network";
}

async function call<T extends { ok: true }>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  let data: unknown;
  try {
    res = await fetch(endpoint(path), {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    data = await res.json();
  } catch (err) {
    if (err instanceof LeaderboardError) throw err;
    throw new LeaderboardError("network");
  }
  if (res.ok && isOk(data)) return data as T;
  throw new LeaderboardError(errorCode(data));
}

export async function submitScore(req: SubmitScoreRequest): Promise<SubmitScoreResponse> {
  return call<SubmitScoreResponse>("/api/scores", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
}

export async function getScores(
  levelId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<GetScoresResponse> {
  const query = new URLSearchParams({ level: levelId, limit: String(limit) });
  return call<GetScoresResponse>(`/api/scores?${query.toString()}`);
}
