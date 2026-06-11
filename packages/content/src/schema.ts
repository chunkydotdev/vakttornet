/**
 * THE CONTENT CONTRACT — frozen. All game tuning lives in data files
 * validated by these schemas, never as constants inside the sim or renderer.
 * `assetId` fields must exist in @vakttornet/assets ASSET_IDS.
 */
import { z } from "zod";

export const enemyDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetId: z.string(),
  hp: z.number().positive(),
  /** tiles per second */
  speed: z.number().positive(),
  /** gold awarded on kill; also added to run score */
  bounty: z.number().nonnegative(),
});
export type EnemyDef = z.infer<typeof enemyDefSchema>;

export const towerLevelSchema = z.object({
  /** gold cost to buy (level 1) or upgrade to this level */
  cost: z.number().positive(),
  damage: z.number().positive(),
  /** tiles, measured from tower tile center */
  range: z.number().positive(),
  /** ticks between shots (TICK_RATE = 30/s) */
  cooldownTicks: z.number().int().positive(),
  /** tiles per second */
  projectileSpeed: z.number().positive(),
});
export type TowerLevel = z.infer<typeof towerLevelSchema>;

export const towerDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetId: z.string(),
  description: z.string(),
  levels: z.array(towerLevelSchema).min(1).max(3),
});
export type TowerDef = z.infer<typeof towerDefSchema>;

export const waveEntrySchema = z.object({
  enemyTypeId: z.string(),
  count: z.number().int().positive(),
  /** ticks between spawns within this entry */
  spacingTicks: z.number().int().positive(),
  /** ticks to wait after the previous entry finished spawning */
  delayTicks: z.number().int().nonnegative().default(0),
});
export type WaveEntry = z.infer<typeof waveEntrySchema>;

export const waveDefSchema = z.object({
  entries: z.array(waveEntrySchema).min(1),
});
export type WaveDef = z.infer<typeof waveDefSchema>;

export const levelDefSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    /** equal-length rows of map chars: . buildable, # blocked, P path, S spawn, E exit */
    map: z.array(z.string().min(1)).min(3),
    waves: z.array(waveDefSchema).min(1),
    startGold: z.number().nonnegative(),
    startLives: z.number().int().positive(),
    /** meta points needed to unlock; 0 = unlocked from the start */
    unlockPoints: z.number().nonnegative(),
  })
  .refine((l) => l.map.every((row) => row.length === l.map[0]!.length), {
    message: "all map rows must have equal length",
  })
  .refine(
    (l) => countChar(l.map, "S") === 1 && countChar(l.map, "E") === 1,
    { message: "map must contain exactly one S and one E" },
  );
export type LevelDef = z.infer<typeof levelDefSchema>;

export const metaUpgradeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  /** meta-point cost per rank */
  cost: z.number().positive(),
  maxRank: z.number().int().positive(),
  effect: z.object({
    kind: z.enum(["damageMult", "rangeMult", "startGold", "startLives"]),
    /** per rank: damageMult/rangeMult add `value` to the multiplier (0.1 = +10%); startGold/startLives add `value` flat */
    value: z.number().positive(),
  }),
});
export type MetaUpgradeDef = z.infer<typeof metaUpgradeSchema>;

export const globalsSchema = z.object({
  /** fraction of gold spent returned when selling a tower */
  sellRefundRatio: z.number().min(0).max(1),
  /** score bonus on clearing wave i (0-based): (i+1) * waveClearBonusPerWave */
  waveClearBonusPerWave: z.number().nonnegative(),
  /** score bonus per remaining life when a run is won */
  winBonusPerLife: z.number().nonnegative(),
});
export type Globals = z.infer<typeof globalsSchema>;

export const contentBundleSchema = z.object({
  enemies: z.array(enemyDefSchema).min(1),
  towers: z.array(towerDefSchema).min(1),
  levels: z.array(levelDefSchema).min(1),
  metaUpgrades: z.array(metaUpgradeSchema),
  globals: globalsSchema,
});
export type ContentBundle = z.infer<typeof contentBundleSchema>;

function countChar(rows: string[], ch: string): number {
  return rows.reduce(
    (n, row) => n + row.split("").filter((c) => c === ch).length,
    0,
  );
}
