# @vakttornet/assets

SVG sprites + the manifest mapping stable asset ids to files.

**The asset contract:** game code and content data reference assets ONLY by
id (e.g. `tower.tomte`, `enemy.troll`, `tile.grass`). The manifest maps each
id to an SVG file. To replace placeholder art with real art, overwrite the
SVG file (or point the manifest entry at a new file) — ids never change, so
no code changes are ever needed.

- `src/ids.ts` — `ASSET_IDS` const array + `AssetId` type. Pure TS, safe to
  import anywhere (including node test runners).
- `src/manifest.ts` — id → resolved URL. Imports `.svg?url`, so ONLY the Vite
  app may import it (not vitest in sim/content).
- `svg/` — one file per asset id, dots replaced by dashes
  (`tower.tomte` → `tower-tomte.svg`). ViewBox `0 0 64 64`; one tile = 64
  units. Enemies/towers should fill ~48-56 units centered, tiles the full 64.
