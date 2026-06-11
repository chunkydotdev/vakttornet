/**
 * Shared test fixtures. Everything is validated through the real zod
 * schemas from @vakttornet/content so the tests exercise the same shapes
 * the game will ship.
 *
 * Timing note: enemy speeds are multiples of 7.5 tiles/s on purpose —
 * 7.5 * TICK_SECONDS === 0.25 exactly in IEEE-754, so movement assertions
 * can use exact tick counts (runt walks the 6-tile straight map in 24 ticks).
 */
import {
  contentBundleSchema,
  levelDefSchema,
  type ContentBundle,
  type LevelDef,
} from "@vakttornet/content";
import { createSim, type MetaModifiers, type Sim } from "../src/index";

/** 7x5 map with a straight 6-tile spawn→exit run along row 2. */
export const STRAIGHT_MAP = [
  ".......",
  ".......",
  "SPPPPPE",
  ".......",
  ".......",
];

export interface WaveEntryInput {
  enemyTypeId: string;
  count: number;
  spacingTicks: number;
  delayTicks?: number;
}

export interface LevelOverrides {
  map?: string[];
  waves?: Array<{ entries: WaveEntryInput[] }>;
  startGold?: number;
  startLives?: number;
}

export function makeLevel(overrides: LevelOverrides = {}): LevelDef {
  return levelDefSchema.parse({
    id: "test-level",
    name: "Test Level",
    map: overrides.map ?? STRAIGHT_MAP,
    waves: overrides.waves ?? [
      { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1, delayTicks: 0 }] },
    ],
    startGold: overrides.startGold ?? 100,
    startLives: overrides.startLives ?? 3,
    unlockPoints: 0,
  });
}

export function makeContent(level: LevelDef): ContentBundle {
  return contentBundleSchema.parse({
    enemies: [
      // 7.5 tiles/s = exactly 0.25 tiles/tick
      { id: "runt", name: "Runt", assetId: "enemy-runt", hp: 10, speed: 7.5, bounty: 5 },
      // 3.75 tiles/s = exactly 0.125 tiles/tick
      { id: "tank", name: "Tank", assetId: "enemy-tank", hp: 1000, speed: 3.75, bounty: 20 },
    ],
    towers: [
      {
        id: "archer",
        name: "Archer",
        assetId: "tower-archer",
        description: "Single-target workhorse",
        levels: [
          { cost: 50, damage: 12, range: 3, cooldownTicks: 10, projectileSpeed: 30 },
          { cost: 40, damage: 24, range: 3.5, cooldownTicks: 8, projectileSpeed: 30 },
          { cost: 60, damage: 48, range: 4, cooldownTicks: 6, projectileSpeed: 30 },
        ],
      },
      {
        id: "sniper",
        name: "Sniper",
        assetId: "tower-sniper",
        description: "Whole-map range, 1 damage — for targeting tests",
        levels: [{ cost: 30, damage: 1, range: 20, cooldownTicks: 5, projectileSpeed: 60 }],
      },
      {
        id: "shed",
        name: "Shed",
        assetId: "tower-shed",
        description: "Cheap and short-ranged — for refund/range tests",
        levels: [{ cost: 25, damage: 1, range: 1, cooldownTicks: 30, projectileSpeed: 30 }],
      },
      {
        id: "lantern",
        name: "Sun Lantern",
        assetId: "tower-lantern",
        description: "Petrifies: half speed for 12 ticks — for slow tests",
        // cooldownTicks 90 → fires exactly once in typical test windows.
        levels: [
          {
            cost: 30,
            damage: 1,
            range: 20,
            cooldownTicks: 90,
            projectileSpeed: 60,
            slow: { factor: 0.5, durationTicks: 12 },
          },
        ],
      },
      {
        id: "beacon",
        name: "Dawn Beacon",
        assetId: "tower-beacon",
        description: "Heavy hit + mild slow — for overwrite/kill slow tests",
        levels: [
          {
            cost: 30,
            damage: 50,
            range: 20,
            cooldownTicks: 90,
            projectileSpeed: 60,
            slow: { factor: 0.8, durationTicks: 40 },
          },
        ],
      },
    ],
    levels: [level],
    metaUpgrades: [],
    globals: { sellRefundRatio: 0.5, waveClearBonusPerWave: 10, winBonusPerLife: 2 },
  });
}

export function setup(
  levelOverrides: LevelOverrides = {},
  opts: { seed?: number; meta?: MetaModifiers } = {},
): { sim: Sim; level: LevelDef; content: ContentBundle } {
  const level = makeLevel(levelOverrides);
  const content = makeContent(level);
  const sim = createSim(level, content, { seed: opts.seed ?? 42, meta: opts.meta });
  return { sim, level, content };
}
