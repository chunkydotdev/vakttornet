# Vakttornet

Tile-based roguelike tower defense for the OpenSverige "Bygg spel med AI"
hackathon. **Submission deadline: Sunday June 14, 2026 at 00:00** (end of
Saturday) via Discord `#hackathon-spel` with a playable browser link.
Judging: fun, creativity, polish, open-source reusability (1-5 points each).
Polish beats feature count.

## Theme — Vättar & Troll

Swedish folklore, dusk-forest mood, **all player-facing copy in Swedish**.
The watchtower guards a röd stuga at the edge of mörka skogen. Towers:
`tomte` (Tomten, cheap/fast), `runsten` (Runstenen, heavy/slow), `sollykta`
(Sollyktan, long range + slow — sunlight petrifies). Enemies: `myling`
(fast ghost), `vatte` (tiny swarm), `troll` (tank). Stay on-theme for any
new content, names, and art; lantern-amber is the UI accent color.

Economy language: a run scores **poäng** (end screen + leaderboard only);
the banked/spendable meta currency is **trollsilver** (`ui.trollsilver`
icon), earned 1:1 from score. In-run **guld** is a separate economy.
Copy style: sagoton, and avoid the AI em-dash tic — at most a handful of
em dashes across all player-facing prose; vary sentence shapes (see the
sägner for the house voice).

## Music

Background tracks are pure file-drops in `apps/game/public/audio/` (contract
in its README: `hub.mp3`, `battle.mp3`, `level01`–`09`, mp3/ogg; missing files
fall back battle → silence). `apps/game/src/game/music.ts` owns playback —
probing, crossfade, autoplay arming, persisted mute.

## Architecture

Turborepo + pnpm. Packages export raw TypeScript (`main: ./src/index.ts`) —
no package build step; Vite and Vitest compile on the fly.

- **apps/game** — Vite + React 19. React renders UI chrome (menus, HUD,
  upgrade shop); the board is a Canvas 2D game loop OUTSIDE React.
- **packages/sim** — pure deterministic TD engine. THE CONTRACT is
  `packages/sim/src/types.ts`. No DOM, no Date.now(), no Math.random()
  (seeded RNG only). Fixed timestep (30 ticks/s); renderer interpolates
  prevPos→pos.
- **packages/content** — all game tuning as zod-validated data
  (`src/schema.ts` is the contract): towers, enemies, waves, levels, meta
  upgrades, globals. Adding a level = adding a data file.
- **packages/assets** — SVG sprites + id→url manifest. Stable ids; art is
  swappable without code changes (see its README).

## Iron rules

1. **Game logic goes in `packages/sim`, tuning numbers in
   `packages/content`.** If you're typing a balance number inside sim or
   app code, stop — it belongs in content.
2. **The sim stays pure and deterministic.** Same level + seed + commands ⇒
   identical run. Every sim feature ships with Vitest coverage in the same
   PR/commit; determinism itself has a regression test.
3. **One-way data flow.** The renderer reads `sim.state` and calls command
   methods (`placeTower`, `startWave`, ...). It never mutates sim state.
4. **Contracts are frozen** (`sim/src/types.ts`, `content/src/schema.ts`).
   If implementation truly forces a change, flag it loudly in your report —
   never silently reshape a contract.
5. **Commit small and often** — every working increment. AI-built code needs
   rollback points.
6. **Verify by playing.** Sim tests prove logic; rendering/UX changes need a
   real click-through in the browser (`pnpm dev`).
7. Reference assets only by id from the manifest. Never hardcode SVG paths.

## Commands

```bash
pnpm install
pnpm dev          # vite dev server (apps/game)
pnpm test         # vitest in sim + content
pnpm typecheck    # tsc --noEmit everywhere
pnpm build        # production build (apps/game/dist)
```

## Deploy

`main` auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`
(Vite `base: "/vakttornet/"`). The Pages URL is the hackathon submission
link — keep `main` playable.
