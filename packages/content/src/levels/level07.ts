import type { LevelDef } from "../schema";

/**
 * Level 7 — Älvdeltat. 16×11, the braided river delta: more water than
 * land. The path is a chain of causeways zig-zagging between channels; the
 * only deep build pocket is the spit at cols 9-11 covering three corridors
 * at once. Short path (25 tiles: S + 23 P + E) — towers get few looks at
 * each väsen, so every shot must land.
 *
 * Bäckahästarna run in herds here (slowResist 1 — never förstenad), so
 * petrify-stalling fails; bring sniper-Näcken for the herds and Runstenens
 * blixtpuls for the floods. Herd math: a 90-hp bäckahäst dies to one L3
 * Näcken-shot (130 dmg, every 75 ticks = one horse per 2.5 s) or two L1-2
 * shots; the biggest herd (12 at 24-tick spacing) spawns over ~9 s and
 * spends ~13 s on the 25-tile path, so one Näcken on the spit plus tomtar
 * mopping up holds it — wave counts stay as they were. The packed vätte
 * trains (30 at 7-tick spacing ≈ 0.5 tiles apart) crowd 7-8 deep into
 * Runstenens radius, and a single 12-dmg pulse kills every 12-hp vätte
 * standing in it.
 *
 * Wave HP budget: 750 / 862 / 960 / 1170 / 1275 / 1440 / 1620 / 1810 /
 * 2040 / 2330 / 2580 / finale 4920 (Sjörået 2600 + a heavy 2320 escort —
 * the delta is her home turf and the whole river rises with her).
 * Unlocks at 6000.
 */
export const level07: LevelDef = {
  id: "level07",
  name: "Älvdeltat",
  map: [
    "~~~~~.......~~~~",
    "~~~~........~~~~",
    "~~~..........~~~",
    "~~..PPPPP.....~~",
    "~~..P~~~P...PPPE",
    "SPPPP~~~P...P~~~",
    "~~...~~~P...P~~~",
    "~~~.....PPPPP..~",
    "~~~~...~~....~~~",
    "~~~~~..~~~....~~",
    "~~~~~~~~~~~..~~~",
  ],
  waves: [
    {
      entries: [
        { enemyTypeId: "backahast", count: 5, spacingTicks: 36, delayTicks: 0 },
        { enemyTypeId: "myling", count: 10, spacingTicks: 16, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "skuggvarg", count: 10, spacingTicks: 13, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 26, spacingTicks: 8, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 7, spacingTicks: 32, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 6, spacingTicks: 14, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 4, spacingTicks: 50, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 30, spacingTicks: 7, delayTicks: 45 },
        { enemyTypeId: "myling", count: 3, spacingTicks: 14, delayTicks: 30 },
      ],
    },
    {
      // a skattvätte rides the herd — 40 gold if it never reaches the reeds
      entries: [
        { enemyTypeId: "backahast", count: 8, spacingTicks: 30, delayTicks: 0 },
        { enemyTypeId: "skattvatte", count: 1, spacingTicks: 30, delayTicks: 45 },
        { enemyTypeId: "skuggvarg", count: 9, spacingTicks: 12, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 4, spacingTicks: 52, delayTicks: 0 },
        { enemyTypeId: "myling", count: 12, spacingTicks: 13, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 10, spacingTicks: 26, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 4, spacingTicks: 48, delayTicks: 60 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "troll", count: 8, spacingTicks: 40, delayTicks: 0 },
        { enemyTypeId: "vatte", count: 30, spacingTicks: 7, delayTicks: 45 },
        { enemyTypeId: "skuggvarg", count: 6, spacingTicks: 13, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "kyrkogrim", count: 6, spacingTicks: 45, delayTicks: 0 },
        { enemyTypeId: "backahast", count: 8, spacingTicks: 28, delayTicks: 45 },
        { enemyTypeId: "myling", count: 8, spacingTicks: 14, delayTicks: 30 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "stentroll", count: 7, spacingTicks: 46, delayTicks: 0 },
        { enemyTypeId: "skuggvarg", count: 8, spacingTicks: 12, delayTicks: 45 },
      ],
    },
    {
      entries: [
        { enemyTypeId: "backahast", count: 12, spacingTicks: 24, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 5, spacingTicks: 45, delayTicks: 45 },
        { enemyTypeId: "vatte", count: 30, spacingTicks: 7, delayTicks: 30 },
        { enemyTypeId: "myling", count: 8, spacingTicks: 13, delayTicks: 30 },
      ],
    },
    {
      // Finale: 2320 hp HEAVY escort + Sjörået 2600 = 4920.
      entries: [
        { enemyTypeId: "backahast", count: 10, spacingTicks: 24, delayTicks: 0 },
        { enemyTypeId: "kyrkogrim", count: 4, spacingTicks: 42, delayTicks: 45 },
        { enemyTypeId: "troll", count: 5, spacingTicks: 40, delayTicks: 45 },
        // every channel stills at once — the river walks
        { enemyTypeId: "sjoraet", count: 1, spacingTicks: 30, delayTicks: 90 },
      ],
    },
  ],
  startGold: 150,
  startLives: 8,
  unlockPoints: 6000,
};
