/**
 * THE LEADERBOARD API CONTRACT — frozen. The Worker implements it; the game
 * client codes against it. Pure types only in this file (imported by the
 * browser app — keep it free of Worker/DOM dependencies).
 *
 * Boards are per level, wins only. Ranking: vardtrad DESC, score DESC,
 * createdAt ASC (earlier submission wins ties — first to set the mark).
 */

export interface SubmitScoreRequest {
  levelId: string;
  /** 2-12 chars, [a-zA-Z0-9åäöÅÄÖ_\- ] after trim */
  name: string;
  /** vårdträd standing at the moment of victory */
  vardtrad: number;
  /** final run score */
  score: number;
}

export interface SubmitScoreResponse {
  ok: true;
  /** 1-based rank on that level's board after insertion */
  rank: number;
}

export interface LeaderboardEntry {
  name: string;
  vardtrad: number;
  score: number;
  /** ISO timestamp */
  createdAt: string;
}

export interface GetScoresResponse {
  ok: true;
  levelId: string;
  entries: LeaderboardEntry[];
}

export interface ApiError {
  ok: false;
  /** machine-readable: invalid-name | unknown-level | out-of-bounds |
   * rate-limited | bad-request */
  error: string;
}

/** Routes:
 *  POST /api/scores            body: SubmitScoreRequest → 201 SubmitScoreResponse | 400/429 ApiError
 *  GET  /api/scores?level=<id>&limit=<n≤50>  → 200 GetScoresResponse | 400 ApiError
 */
export const NAME_PATTERN = /^[a-zA-Z0-9åäöÅÄÖ_\- ]{2,12}$/;
export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 20;
