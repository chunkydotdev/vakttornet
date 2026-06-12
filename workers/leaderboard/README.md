# @vakttornet/leaderboard

Cloudflare Worker + D1 backing the per-level leaderboards. The API contract
lives in [`src/api.ts`](src/api.ts) (frozen — the game client imports its
types directly). Submissions are validated against the real game content
(`@vakttornet/content`): names per `NAME_PATTERN`, level ids must exist,
vårdträd is capped at the level's buildable-tile count, and scores at a
content-derived ceiling. Rate limiting stores only salted SHA-256 IP hashes,
never raw IPs.

## First deploy

From `workers/leaderboard/`:

```bash
# 1. Authenticate wrangler with the Cloudflare account
pnpm exec wrangler login

# 2. Create the D1 database
pnpm exec wrangler d1 create vakttornet-leaderboard

# 3. Copy the database_id from the command output and paste it into
#    wrangler.toml (replace the "TBD" placeholder)

# 4. Apply the schema to the remote database (idempotent, safe to re-run)
pnpm exec wrangler d1 execute vakttornet-leaderboard --remote --file=schema.sql

# 5. Deploy the Worker
pnpm exec wrangler deploy
```

The deploy output prints the `*.workers.dev` URL. Allowed CORS origins are
configured in `wrangler.toml` under `[vars] ALLOWED_ORIGINS` (comma-separated,
exact match, no wildcards).

## Local dev

```bash
# Apply the schema to the local D1 (stored under .wrangler/state)
pnpm exec wrangler d1 execute vakttornet-leaderboard --local --file=schema.sql

# Start the Worker locally on http://localhost:8787
pnpm dev
```

`pnpm dev` runs `wrangler dev --local`, which uses the same local D1 state
the `--local` execute wrote to. Re-run the execute command any time —
`schema.sql` is idempotent.

Smoke test (the Worker rejects requests without an allowed `Origin`):

```bash
curl -s -H "Origin: http://localhost:5173" \
  "http://localhost:8787/api/scores?level=level01"

curl -s -X POST -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{"levelId":"level01","name":"Saga","vardtrad":3,"score":500}' \
  "http://localhost:8787/api/scores"
```

## Tests & typecheck

```bash
pnpm --filter @vakttornet/leaderboard test        # vitest (pure modules, no miniflare)
pnpm --filter @vakttornet/leaderboard typecheck
```
