import type { LevelDef } from "../schema";

/**
 * Level 4 — Kolarmilan. 15×10, the long serpentine: four full sweeps past
 * the smouldering charcoal kiln. The corridors sandwich three buildable
 * lanes (rows 2, 4, 6) with double/triple coverage — the kiln-watcher's
 * reward for patience. Path length: 58 tiles (S + 56 P + E).
 *
 * Skuggvargen debuts here: faster than mylingen with twice the hide, it
 * punishes thin early coverage on the long sweeps.
 *
 * Wave HP budget: 400 / 516 / 610 / 808 / 920 / 1150 / 1364 / 1570 / 1740 /
 * finale 2002 (Vättekungen 700 + 1302 escort — a far stronger retinue than
 * the 884 he mustered in Gläntan; the old king has learned).
 * Unlocks at 1800 (post-level03 grind, ~Näcken + a couple of meta ranks).
 */
export const level04: LevelDef = {
  id: "level04",
  name: "Kolarmilan",
  map: [
    "...#.......#...",
    "SPPPPPPPPPPPPP.",
    ".............P.",
    ".PPPPPPPPPPPPP.",
    ".P......#......",
    ".PPPPPPPPPPPPP.",
    ".............P.",
    "..PPPPPPPPPPPP.",
    "..P...#........",
    "..PE...........",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "skuggvarg", count: 4, spacingTicks: 24, delayTicks: 0 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 22, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 10, spacingTicks: 20, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 18, spacingTicks: 9, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "skuggvarg", count: 6, spacingTicks: 20, delayTicks: 0 },
        { enemyTypeId: "troll", count: 2, spacingTicks: 60, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 3, spacingTicks: 55, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 4, spacingTicks: 18, delayTicks: 45 },
        { enemyTypeId: "vatte", count: 14, spacingTicks: 9, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 16, spacingTicks: 14, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 8, spacingTicks: 16, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 5, spacingTicks: 48, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 8, delayTicks: 45 },
        { enemyTypeId: "myling", count: 7, spacingTicks: 18, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "skuggvarg", count: 12, spacingTicks: 12, delayTicks: 0 },
        { enemyTypeId: "troll", count: 4, spacingTicks: 50, delayTicks: 60 },
        { enemyTypeId: "vatte", count: 12, spacingTicks: 8, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 20, spacingTicks: 11, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 10, spacingTicks: 14, delayTicks: 45 },
        { enemyTypeId: "troll", count: 3, spacingTicks: 50, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 8, spacingTicks: 42, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 8, spacingTicks: 14, delayTicks: 45 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 14, delayTicks: 30 },
      ],
    },
    {
      // Finale: 1302 hp escort + Vättekungen 700 = 2002.
      entries: [
        { enemyTypeId: "skuggvarg", count: 10, spacingTicks: 12, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 16, spacingTicks: 7, delayTicks: 45 },
        { enemyTypeId: "troll", count: 4, spacingTicks: 45, delayTicks: 60 },
        // the kiln-smoke parts — the king is back, and angrier
        { enemyTypeId: "vattekungen", count: 1, spacingTicks: 30, delayTicks: 90 },
      ],
    },
  ],
  startGold: 160,
  startLives: 10,
  unlockPoints: 1800,
};
