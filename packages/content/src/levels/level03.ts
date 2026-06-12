import type { LevelDef } from "../schema";

/**
 * Level 3 — Näckens tjärn. 14×10. A dark tarn cuts the board: water (~) pools
 * in the top-left, fills the center, and floods the bottom-right corner. The
 * path rings the central tarn — east along the top, down the far side, back
 * along the south shore, around the west bank, then one long run past the
 * stuga. Column 10 (rows 3-6) is the prize: a one-tile build corridor pinched
 * between tarn and path with triple corridor coverage.
 * Path length: 44 tiles (S + 42 P + E).
 *
 * Wave HP budget (first pass): 300 / 396 / 604 / 760 / 980 / 1300 / 1500 /
 * 1928 / 2640 — well past level02's finale (1800). Boss pass: wave 9
 * closes with Sjörået (2600 hp) risen from the tarn. Escort trimmed
 * 2640 → 696 so the finale lands at 3296 total (+24.8% over the old 2640).
 * Waves 1-2 fall to the
 * 2-3 tomtar that 140 start gold plus early bounties buy; the vätte floods
 * (waves 6-9) want Runstenens blixtpuls on the corridor — a 12-dmg L1 pulse
 * erases every 12-hp vätte in range at once — while sniper-Näckens heavy
 * shots and the gold that only a tended Vårdträd provides answer the troll
 * walls (8-9): L1 Näcken three-shots a 140-hp troll. Mylingar come in tight
 * rushes (waves 4, 7, 9).
 */
export const level03: LevelDef = {
  id: "level03",
  name: "Näckens tjärn",
  map: [
    "~~~..........~",
    ".~~..#.......~",
    "SPPPPPPPPPPP.~",
    ".....~~~~~.P..",
    "..#..~~~~~.P..",
    ".PPPPP~~~~.P..",
    ".P...P~~~~.P..",
    ".P...PPPPPPP..",
    ".P.......#..~~",
    ".PPPPPPPPPPPE~",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "myling", count: 8, spacingTicks: 26, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 5, spacingTicks: 12, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "vatte", count: 18, spacingTicks: 9, delayTicks: 0 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 22, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 2, spacingTicks: 60, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 12, spacingTicks: 9, delayTicks: 45 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 20, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 16, spacingTicks: 11, delayTicks: 0 },
        { enemyTypeId: "troll", count: 2, spacingTicks: 55, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 4, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 8, delayTicks: 45 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 18, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "vatte", count: 30, spacingTicks: 7, delayTicks: 0 },
        { enemyTypeId: "troll", count: 5, spacingTicks: 48, delayTicks: 60 },
        { enemyTypeId: "myling", count: 8, spacingTicks: 16, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 22, spacingTicks: 9, delayTicks: 0 },
        { enemyTypeId: "troll", count: 6, spacingTicks: 45, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 10, spacingTicks: 40, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 24, spacingTicks: 7, delayTicks: 45 },
        { enemyTypeId: "myling", count: 8, spacingTicks: 14, delayTicks: 30 },
      ],
    },
    {
      // Finale: 696 hp escort + Sjörået 2600 = 3296 (was 2640, +24.8%)
      entries: [
        { enemyTypeId: "troll", count: 3, spacingTicks: 36, delayTicks: 0 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 8, delayTicks: 45 },
        { enemyTypeId: "vatte", count: 8, spacingTicks: 6, delayTicks: 60 },
        // the tarn stills, then Sjörået rises
        { enemyTypeId: "sjoraet", count: 1, spacingTicks: 30, delayTicks: 90 },
      ],
    },
  ],
  startGold: 140,
  startLives: 8,
  unlockPoints: 1000,
};
