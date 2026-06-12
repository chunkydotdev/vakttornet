import type { LevelDef } from "../schema";

/**
 * Level 9 — Urskogen. 16×11, the open field: the primeval forest floor,
 * almost everything buildable, only a handful of ancient trunks (#) as
 * anchors. The path makes three broad north-south sweeps with short
 * cross-overs — total freedom of placement, and waves heavy enough that
 * freedom alone won't save you. Path length: 33 tiles (S + 31 P + E).
 *
 * Everything walks here. Fourteen waves, ending with Skogsrået herself
 * (7500 hp, slowResist 0.5 — half the sunlight slides off her).
 *
 * Wave HP budget: 1110 / 1320 / 1350 / 1585 / 1740 / 2030 / 2250 / 2520 /
 * 2800 / 3150 / 3390 / 3690 / 3940 / finale 8950 (Skogsrået 7500 + 1450).
 * Unlocks at 2750 lifetime trollsilver — the end of the ladder.
 */
export const level09: LevelDef = {
  id: "level09",
  name: "Urskogen",
  map: [
    "..#..........#..",
    ".......#........",
    "........PPPPP...",
    "SPPPP...P...P...",
    ".#..P...P...P...",
    "....P...P...P..#",
    "....P...P...P...",
    "....P...P...P.#.",
    "....PPPPP...PPPE",
    "..#.............",
    "...........#....",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "skuggvarg", count: 12, spacingTicks: 11, delayTicks: 0 },
        { enemyTypeId: "myling", count: 15, spacingTicks: 12, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 4, spacingTicks: 52, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 8, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 9, spacingTicks: 26, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 3, spacingTicks: 50, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 7, spacingTicks: 42, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 11, spacingTicks: 11, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 6, spacingTicks: 45, delayTicks: 0 },
        { enemyTypeId: "myling", count: 22, spacingTicks: 10, delayTicks: 45 },
      ],
    },
    {
      // two skattvättar dart between the trunks — the forest pays its debts
      entries: [
        { enemyTypeId: "backahast", count: 10, spacingTicks: 24, delayTicks: 0 },
        { enemyTypeId: "skattvatte", count: 2, spacingTicks: 45, delayTicks: 45 },
        { enemyTypeId: "skuggvarg", count: 14, spacingTicks: 10, delayTicks: 30 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 7, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 7, spacingTicks: 46, delayTicks: 0 },
        { enemyTypeId: "myling", count: 12, spacingTicks: 12, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 8, spacingTicks: 42, delayTicks: 0 },
        { enemyTypeId: "backahast", count: 8, spacingTicks: 26, delayTicks: 45 },
        { enemyTypeId: "vatte", count: 30, spacingTicks: 7, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 12, spacingTicks: 36, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 16, spacingTicks: 10, delayTicks: 45 },
        { enemyTypeId: "myling", count: 8, spacingTicks: 13, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 9, spacingTicks: 42, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 4, spacingTicks: 45, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 16, spacingTicks: 20, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 18, spacingTicks: 9, delayTicks: 45 },
        { enemyTypeId: "vatte", count: 40, spacingTicks: 6, delayTicks: 30 },
        { enemyTypeId: "myling", count: 16, spacingTicks: 10, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 10, spacingTicks: 40, delayTicks: 0 },
        { enemyTypeId: "stentroll", count: 7, spacingTicks: 44, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 14, spacingTicks: 34, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 6, spacingTicks: 42, delayTicks: 45 },
        { enemyTypeId: "backahast", count: 10, spacingTicks: 22, delayTicks: 30 },
      ],
    },
    {
      // Finale: 1450 hp escort + Skogsrået 7500 = 8950. The last sägen.
      entries: [
        { enemyTypeId: "kyrkogrim", count: 5, spacingTicks: 42, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 10, spacingTicks: 10, delayTicks: 45 },
        // the urskog holds its breath — she is beautiful, and she is coming
        { enemyTypeId: "skogsraet", count: 1, spacingTicks: 30, delayTicks: 120 },
      ],
    },
  ],
  startGold: 130,
  startLives: 8,
  unlockPoints: 2750,
};
