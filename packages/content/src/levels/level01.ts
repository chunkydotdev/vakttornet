import type { LevelDef } from "../schema";

/**
 * Level 1 — Gläntan. 13×9, gentle snake path with several bends through the
 * forest clearing. Path length: 22 tiles (S + 20 P + E).
 *
 * Wave HP budget (first pass): 180 / 300 / 312 / 520 / 604 / 920 / 1272.
 * Boss pass: wave 7 closes with Vättekungen (700 hp). Escort trimmed
 * 1272 → 884 so the finale lands at 1584 total (+24.5% over the old 1272)
 * — the king is the threat, not a pile-on.
 * Start gold 120 buys two tomtar; bounties fund a runsten or sollykta by
 * wave 3-4 and upgrades from wave 5 on.
 */
export const level01: LevelDef = {
  id: "level01",
  name: "Gläntan",
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
        { enemyTypeId: "myling", count: 6, spacingTicks: 30, delayTicks: 0 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 10, spacingTicks: 24, delayTicks: 0 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "myling", count: 8, spacingTicks: 22, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 6, spacingTicks: 12, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 2, spacingTicks: 60, delayTicks: 0 },
        { enemyTypeId: "myling", count: 8, spacingTicks: 20, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "vatte", count: 12, spacingTicks: 10, delayTicks: 0 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 20, delayTicks: 60 },
        { enemyTypeId: "troll", count: 2, spacingTicks: 60, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 4, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "myling", count: 12, spacingTicks: 16, delayTicks: 45 },
      ],
    },
    {
      // Finale: 884 hp escort + Vättekungen 700 = 1584 (was 1272, +24.5%)
      entries: [
        { enemyTypeId: "vatte", count: 12, spacingTicks: 8, delayTicks: 0 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 16, delayTicks: 30 },
        { enemyTypeId: "troll", count: 4, spacingTicks: 45, delayTicks: 60 },
        // dramatic pause, then the king himself
        { enemyTypeId: "vattekungen", count: 1, spacingTicks: 30, delayTicks: 90 },
      ],
    },
  ],
  startGold: 120,
  startLives: 10,
  unlockPoints: 0,
};
