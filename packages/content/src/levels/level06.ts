import type { LevelDef } from "../schema";

/**
 * Level 6 — Gruvgången. 16×10, the mine gallery: a narrow path hewn through
 * solid rock (#), with mine-prop pillars splitting the upper gallery. Build
 * space is scarce and every tile counts — rows 3 and 5 are one-tile shelves
 * with double corridor coverage. Path length: 38 tiles (S + 36 P + E).
 *
 * Kyrkogrimen debuts here: the buried guardian shrugs off most of
 * Sollyktans petrify (slowResist 0.7) — the gallery must hit hard instead.
 * Stentroll columns march thick; mind the trollyngel they split into.
 *
 * Wave HP budget: 600 / 768 / 920 / 1050 / 1380 / 1520 / 1710 / 1990 /
 * 2160 / 2410 / finale 4700 (Gruvkungen 3800, slowResist 0.8, + 900 escort).
 * Unlocks at 1050 lifetime trollsilver.
 */
export const level06: LevelDef = {
  id: "level06",
  name: "Gruvgången",
  map: [
    "################",
    "#..#...#...#...#",
    "SPPPPPPPPPPPP..#",
    "##..#.......P..#",
    "##.PPPPPPPPPP..#",
    "##.P....#......#",
    "##.PPPPPPPPPPP.#",
    "#####...#....P.#",
    "########.####E.#",
    "################",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "skuggvarg", count: 6, spacingTicks: 18, delayTicks: 0 },
        { enemyTypeId: "myling", count: 9, spacingTicks: 18, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 2, spacingTicks: 60, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 24, spacingTicks: 8, delayTicks: 45 },
        { enemyTypeId: "myling", count: 4, spacingTicks: 16, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 3, spacingTicks: 55, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 2, spacingTicks: 16, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 3, spacingTicks: 55, delayTicks: 0 },
        { enemyTypeId: "myling", count: 17, spacingTicks: 12, delayTicks: 45 },
      ],
    },
    {
      // a skattvätte darts through the stentroll column
      entries: [
        { enemyTypeId: "stentroll", count: 4, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "skattvatte", count: 1, spacingTicks: 30, delayTicks: 60 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 8, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 6, spacingTicks: 45, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 8, spacingTicks: 13, delayTicks: 45 },
        { enemyTypeId: "myling", count: 8, spacingTicks: 15, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 5, spacingTicks: 48, delayTicks: 0 },
        { enemyTypeId: "stentroll", count: 3, spacingTicks: 55, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "skuggvarg", count: 14, spacingTicks: 11, delayTicks: 0 },
        { enemyTypeId: "troll", count: 7, spacingTicks: 42, delayTicks: 45 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 8, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 6, spacingTicks: 48, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 3, spacingTicks: 50, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 6, spacingTicks: 45, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 10, spacingTicks: 12, delayTicks: 45 },
        { enemyTypeId: "myling", count: 18, spacingTicks: 10, delayTicks: 30 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 7, delayTicks: 30 },
      ],
    },
    {
      // Finale: 900 hp escort + Gruvkungen 3800 = 4700.
      entries: [
        { enemyTypeId: "stentroll", count: 2, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 2, spacingTicks: 45, delayTicks: 45 },
        // deep in the mountain, a crown of pickaxes begins to clink
        { enemyTypeId: "gruvkungen", count: 1, spacingTicks: 30, delayTicks: 90 },
      ],
    },
  ],
  startGold: 150,
  startLives: 9,
  unlockPoints: 1050,
};
