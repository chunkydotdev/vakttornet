import type { LevelDef } from "../schema";

/**
 * Level 2 — The Hairpin. 14×10, long U-turn serpentine: enemies sweep right,
 * double back, then sweep right again. Towers placed between the corridors
 * (rows 3 and 5) get triple coverage — that's the puzzle.
 * Path length: 39 tiles (S + 37 P + E).
 *
 * Wave HP budget (first pass): 240 / 264 / 580 / 612 / 844 / 1000 / 1100 / 1720.
 * Fewer lives (8) and heavier waves; meta upgrades expected (unlocks at 400).
 */
export const level02: LevelDef = {
  id: "level02",
  name: "The Hairpin",
  map: [
    "..........#...",
    ".#............",
    "SPPPPPPPPPPPP.",
    "............P.",
    "..PPPPPPPPPPP.",
    "..P...........",
    "..PPPPPPPPPPPP",
    "....#........E",
    ".........#....",
    "..............",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "runner", count: 8, spacingTicks: 26, delayTicks: 0 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "swarm", count: 12, spacingTicks: 10, delayTicks: 0 },
        { enemyTypeId: "runner", count: 4, spacingTicks: 22, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "runner", count: 10, spacingTicks: 20, delayTicks: 0 },
        { enemyTypeId: "brute", count: 2, spacingTicks: 60, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "swarm", count: 16, spacingTicks: 9, delayTicks: 0 },
        { enemyTypeId: "brute", count: 3, spacingTicks: 55, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "runner", count: 14, spacingTicks: 16, delayTicks: 0 },
        { enemyTypeId: "swarm", count: 12, spacingTicks: 8, delayTicks: 45 },
        { enemyTypeId: "brute", count: 2, spacingTicks: 55, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "brute", count: 5, spacingTicks: 45, delayTicks: 0 },
        { enemyTypeId: "runner", count: 10, spacingTicks: 16, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "swarm", count: 20, spacingTicks: 7, delayTicks: 0 },
        { enemyTypeId: "brute", count: 4, spacingTicks: 45, delayTicks: 60 },
        { enemyTypeId: "runner", count: 10, spacingTicks: 14, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "brute", count: 8, spacingTicks: 40, delayTicks: 0 },
        { enemyTypeId: "swarm", count: 20, spacingTicks: 7, delayTicks: 45 },
        { enemyTypeId: "runner", count: 12, spacingTicks: 12, delayTicks: 45 },
      ],
    },
  ],
  startGold: 130,
  startLives: 8,
  unlockPoints: 400,
};
