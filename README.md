# Vakttornet 🏰

A tile-based, roguelike tower defense game built for the
[OpenSverige "Bygg spel med AI" hackathon](https://www.opensverige.se/blogg/bygg-spel-med-ai)
— vibecoded with Claude Code as co-builder.

Defend the path, survive the waves, earn points — then spend them on
permanent upgrades and unlock new maps. Lose a run, come back stronger.

**▶ Play:** https://chunkydotdev.github.io/vakttornet/ *(deployed from `main`)*

## Run locally

```bash
pnpm install
pnpm dev
```

## How it's built

Turborepo monorepo, designed so the game logic is provably correct and the
content is moddable:

| Package | What it is |
|---|---|
| `apps/game` | Vite + React UI shell; Canvas 2D renderer with a fixed-timestep game loop |
| `packages/sim` | Pure, deterministic, fully unit-tested TD engine (seeded RNG, zero DOM deps) |
| `packages/content` | Every tower/enemy/wave/level/upgrade as zod-validated data — add a level by adding a file |
| `packages/assets` | SVG sprites behind a stable id manifest — swap art with zero code changes |

## License

MIT — reuse, remix, build upon.
