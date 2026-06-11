import type { LevelDef } from "../schema";

/**
 * Level 1 — Meadow Bend. 13×9, gentle snake path with several bends.
 * Path length: 22 tiles (S + 20 P + E).
 *
 * Wave HP budget (first pass): 180 / 300 / 312 / 520 / 604 / 920 / 1272.
 * Start gold 120 buys two arrow towers; bounties fund a cannon or crossbow
 * by wave 3-4 and upgrades from wave 5 on.
 */
export const level01: LevelDef = {
  id: "level01",
  name: "Meadow Bend",
  map: [
    ".............",
    ".#.........#.",
    "SPPPPPP......",
    "......P...#..",
    "......P.PPPP.",
    "......P.P..P.",
    "#.....PPP..P.",
    "...........PE",
    ".....#.......",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "runner", count: 6, spacingTicks: 30, delayTicks: 0 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "runner", count: 10, spacingTicks: 24, delayTicks: 0 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "runner", count: 8, spacingTicks: 22, delayTicks: 0 },
        { enemyTypeId: "swarm", count: 6, spacingTicks: 12, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "brute", count: 2, spacingTicks: 60, delayTicks: 0 },
        { enemyTypeId: "runner", count: 8, spacingTicks: 20, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "swarm", count: 12, spacingTicks: 10, delayTicks: 0 },
        { enemyTypeId: "runner", count: 6, spacingTicks: 20, delayTicks: 60 },
        { enemyTypeId: "brute", count: 2, spacingTicks: 60, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "brute", count: 4, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "runner", count: 12, spacingTicks: 16, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "swarm", count: 16, spacingTicks: 8, delayTicks: 0 },
        { enemyTypeId: "runner", count: 8, spacingTicks: 16, delayTicks: 30 },
        { enemyTypeId: "brute", count: 6, spacingTicks: 45, delayTicks: 60 },
      ],
    },
  ],
  startGold: 120,
  startLives: 10,
  unlockPoints: 0,
};
