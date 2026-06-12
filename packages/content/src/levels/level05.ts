import type { LevelDef } from "../schema";

/**
 * Level 5 — Bäckravinen. 15×10, the double-U: down the western wall, along
 * the ravine floor, up and over, then down and up again to the eastern rim.
 * A brook (~) trickles diagonally through both pockets, eating prime build
 * tiles. Path length: 39 tiles (S + 37 P + E).
 *
 * Debuts: Stentrollet (splits into two trollyngel on death — leave room to
 * catch the children), Bäckahästen (slowResist 1 — the brook is its home;
 * sunlight glances off, only raw damage answers), and the first rare
 * Skattvätte (wave 4 — bounty 40, kill it before it escapes!).
 *
 * Wave HP budget: 515 / 600 / 720 / 812 / 990 / 1100 / 1410 / 1596 / 1930 /
 * finale 2758 (Trollmodern 1600 + 1158 escort).
 * Unlocks at 700 lifetime trollsilver — enough earned for Vårdträdet (550)
 * or Näcken plus a few meta ranks.
 */
export const level05: LevelDef = {
  id: "level05",
  name: "Bäckravinen",
  map: [
    "S.....#........",
    "P.~............",
    "P.~..PPPPP.....",
    "P..~.P...P.....",
    "P..~.P...P....E",
    "P...~P...P....P",
    "P....P...P~...P",
    "P....P...P~~..P",
    "PPPPPP...PPPPPP",
    ".......#.......",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "myling", count: 8, spacingTicks: 22, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 5, spacingTicks: 20, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 4, spacingTicks: 40, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 8, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 2, spacingTicks: 60, delayTicks: 0 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 18, delayTicks: 45 },
      ],
    },
    {
      // the first skattvätte bolts through under cover of the swarm
      entries: [
        { enemyTypeId: "skuggvarg", count: 8, spacingTicks: 14, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 16, spacingTicks: 8, delayTicks: 30 },
        { enemyTypeId: "skattvatte", count: 1, spacingTicks: 30, delayTicks: 45 },
        { enemyTypeId: "myling", count: 4, spacingTicks: 16, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 5, spacingTicks: 36, delayTicks: 0 },
        { enemyTypeId: "stentroll", count: 2, spacingTicks: 60, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 4, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "myling", count: 10, spacingTicks: 16, delayTicks: 45 },
        { enemyTypeId: "vatte", count: 20, spacingTicks: 8, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 4, spacingTicks: 55, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 6, spacingTicks: 14, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 6, spacingTicks: 32, delayTicks: 0 },
        { enemyTypeId: "troll", count: 6, spacingTicks: 45, delayTicks: 45 },
        { enemyTypeId: "vatte", count: 18, spacingTicks: 8, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 5, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "myling", count: 12, spacingTicks: 13, delayTicks: 45 },
        { enemyTypeId: "skuggvarg", count: 4, spacingTicks: 14, delayTicks: 30 },
      ],
    },
    {
      // Finale: 1158 hp escort + Trollmodern 1600 = 2758.
      entries: [
        { enemyTypeId: "stentroll", count: 3, spacingTicks: 45, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 14, spacingTicks: 7, delayTicks: 45 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 12, delayTicks: 30 },
        // the brook falls silent — she has come down into the ravine
        { enemyTypeId: "trollmodern", count: 1, spacingTicks: 30, delayTicks: 90 },
      ],
    },
  ],
  startGold: 160,
  startLives: 9,
  unlockPoints: 700,
};
