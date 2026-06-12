import type { LevelDef } from "../schema";

/**
 * Level 8 — Vinternatten. 15×11, the spiral: väsen wind inward ring by ring
 * through the frozen forest, and the stuga stands at the heart of it. The
 * longest road in the game (70 tiles: S + 68 P + E) — but the inner rings
 * pass the same build pockets again and again, so a deep core pays four
 * times over. The board is bigger than it looks; so are the waves.
 *
 * Wave HP budget: 915 / 1020 / 1260 / 1400 / 1530 / 1680 / 1980 / 2160 /
 * 2350 / 2640 / 2945 / 3330 / finale 6360 (Isfursten 5200 + 1160 escort —
 * and when he shatters, four mylingar rise from the snow where he fell).
 * Unlocks at 8200.
 */
export const level08: LevelDef = {
  id: "level08",
  name: "Vinternatten",
  map: [
    "....#.....#....",
    "SPPPPPPPPPPPPP.",
    ".............P.",
    ".PPPPPPPPPPP.P.",
    ".P.........P.P.",
    ".P.PPPPPPE.P.P.",
    ".P.P.......P.P.",
    ".P.PPPPPPPPP.P.",
    ".P...........P.",
    ".PPPPPPPPPPPPP.",
    "....#....#.....",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "myling", count: 14, spacingTicks: 14, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 9, spacingTicks: 14, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 3, spacingTicks: 55, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 40, spacingTicks: 6, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 4, spacingTicks: 52, delayTicks: 0 },
        { enemyTypeId: "myling", count: 6, spacingTicks: 15, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "skuggvarg", count: 14, spacingTicks: 11, delayTicks: 0 },
        { enemyTypeId: "backahast", count: 7, spacingTicks: 30, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 4, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "stentroll", count: 3, spacingTicks: 52, delayTicks: 60 },
      ],
    },
    {
      // two skattvättar in the blizzard — 80 gold running loose
      entries: [
        { enemyTypeId: "skuggvarg", count: 12, spacingTicks: 11, delayTicks: 0 },
        { enemyTypeId: "skattvatte", count: 2, spacingTicks: 45, delayTicks: 45 },
        { enemyTypeId: "myling", count: 18, spacingTicks: 11, delayTicks: 30 },
        { enemyTypeId: "vatte", count: 30, spacingTicks: 7, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 9, spacingTicks: 40, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 4, spacingTicks: 48, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 6, spacingTicks: 48, delayTicks: 0 },
        { enemyTypeId: "backahast", count: 6, spacingTicks: 30, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 8, spacingTicks: 42, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 10, spacingTicks: 11, delayTicks: 45 },
        { enemyTypeId: "myling", count: 12, spacingTicks: 12, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 8, spacingTicks: 44, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 40, spacingTicks: 6, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 14, spacingTicks: 22, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 6, spacingTicks: 44, delayTicks: 45 },
        { enemyTypeId: "skuggvarg", count: 11, spacingTicks: 11, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 12, spacingTicks: 36, delayTicks: 0 },
        { enemyTypeId: "stentroll", count: 5, spacingTicks: 48, delayTicks: 45 },
        { enemyTypeId: "myling", count: 10, spacingTicks: 12, delayTicks: 30 },
      ],
    },
    {
      // Finale: 1160 hp escort + Isfursten 5200 = 6360.
      entries: [
        { enemyTypeId: "kyrkogrim", count: 4, spacingTicks: 42, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 8, spacingTicks: 11, delayTicks: 45 },
        // the snow stops falling upward — the winter-night prince has come
        { enemyTypeId: "isfursten", count: 1, spacingTicks: 30, delayTicks: 90 },
      ],
    },
  ],
  startGold: 140,
  startLives: 8,
  unlockPoints: 8200,
};
