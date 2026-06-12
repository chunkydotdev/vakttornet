import type { LevelDef } from "../schema";

/**
 * Level 2 — Trollstigen. 14×10, long U-turn serpentine: väsen sweep right,
 * double back, then sweep right again. Towers placed between the corridors
 * (rows 3 and 5) get triple coverage — that's the puzzle.
 * Path length: 39 tiles (S + 37 P + E).
 *
 * Wave HP budget (first pass): 240 / 264 / 580 / 612 / 844 / 1080 / 1100 / 1800.
 * Boss pass: wave 8 closes with Trollmodern (1600 hp). Escort trimmed
 * 1800 → 630 so the finale lands at 2230 total (+23.9% over the old 1800)
 * — she IS the wall the old troll column only pretended to be.
 * Fewer lives (8) and heavier waves; meta upgrades expected (unlocks at
 * 100 lifetime trollsilver — one Gläntan win banks ≈ 280).
 * Waves 6 and 8 are deliberately troll-heavy — Sollyktans petrify is the
 * intended answer to the lumbering columns.
 */
export const level02: LevelDef = {
  id: "level02",
  name: "Trollstigen",
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
        { enemyTypeId: "myling", count: 8, spacingTicks: 26, delayTicks: 0 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "vatte", count: 12, spacingTicks: 10, delayTicks: 0 },
        { enemyTypeId: "myling", count: 4, spacingTicks: 22, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 10, spacingTicks: 20, delayTicks: 0 },
        { enemyTypeId: "troll", count: 2, spacingTicks: 60, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "vatte", count: 16, spacingTicks: 9, delayTicks: 0 },
        { enemyTypeId: "troll", count: 3, spacingTicks: 55, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 14, spacingTicks: 16, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 12, spacingTicks: 8, delayTicks: 45 },
        { enemyTypeId: "troll", count: 2, spacingTicks: 55, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 6, spacingTicks: 45, delayTicks: 0 },
        { enemyTypeId: "myling", count: 8, spacingTicks: 16, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "vatte", count: 20, spacingTicks: 7, delayTicks: 0 },
        { enemyTypeId: "troll", count: 4, spacingTicks: 45, delayTicks: 60 },
        { enemyTypeId: "myling", count: 10, spacingTicks: 14, delayTicks: 30 },
      ],
    },
    {
      // Finale: 630 hp escort + Trollmodern 1600 = 2230 (was 1800, +23.9%)
      entries: [
        { enemyTypeId: "troll", count: 3, spacingTicks: 40, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 10, spacingTicks: 7, delayTicks: 45 },
        { enemyTypeId: "myling", count: 3, spacingTicks: 12, delayTicks: 45 },
        // the forest goes quiet, then the mother of trolls
        { enemyTypeId: "trollmodern", count: 1, spacingTicks: 30, delayTicks: 90 },
      ],
    },
  ],
  startGold: 130,
  startLives: 8,
  unlockPoints: 100,
};
