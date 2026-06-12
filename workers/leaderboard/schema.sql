-- Leaderboard schema for the vakttornet-leaderboard D1 database.
-- Idempotent: safe to re-run (local and remote).

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level_id TEXT NOT NULL,
  name TEXT NOT NULL,
  vardtrad INTEGER NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contract ordering per level: vardtrad DESC, score DESC, created_at ASC.
CREATE INDEX IF NOT EXISTS idx_scores_board
  ON scores (level_id, vardtrad DESC, score DESC, created_at ASC);

-- Rate limiting: salted SHA-256 of the client IP + minute bucket.
-- Raw IPs are never stored.
CREATE TABLE IF NOT EXISTS submissions_log (
  ip_hash TEXT NOT NULL,
  minute TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_log
  ON submissions_log (ip_hash, minute);
