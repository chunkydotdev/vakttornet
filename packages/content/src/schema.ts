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
  /** render-size multiplier (1 = one tile); bosses are drawn bigger */
  scale: z.number().min(0.5).max(2).default(1),
  /** boss treatment in the UI: hp banner while alive, spawn fanfare */
  boss: z.boolean().default(false),
  /** resistance to slow/petrify: effective factor = factor + (1−factor)×resist.
   * 0 = fully affected (default), 1 = immune. */
  slowResist: z.number().min(0).max(1).default(0),
  /** on death (killed, not leaked), spawns children at the parent's position
   * continuing along the path */
  splitsInto: z
    .object({
      enemyTypeId: z.string(),
      count: z.number().int().positive().max(4),
    })
    .optional(),
});
export type EnemyDef = z.infer<typeof enemyDefSchema>;

export const towerLevelSchema = z.object({
  /** gold cost to buy (level 1) or upgrade to this level */
  cost: z.number().positive(),
  /** 0 = non-attacking tower (e.g. economy): never targets or fires */
  damage: z.number().nonnegative(),
  /** tiles, measured from tower tile center */
  range: z.number().positive(),
  /** ticks between shots (TICK_RATE = 30/s) */
  cooldownTicks: z.number().int().positive(),
  /** tiles per second */
  projectileSpeed: z.number().positive(),
  /** slow (petrify) applied on hit: factor = speed multiplier while active
   * (0.5 = half speed), re-application overwrites factor + duration */
  slow: z
    .object({
      factor: z.number().min(0.1).max(1),
      durationTicks: z.number().int().positive(),
    })
    .optional(),
  /** splash: on hit, full damage to every enemy within this tile radius of
   * the impact (flat, no falloff) */
  splashRadius: z.number().positive().optional(),
  /** economy: gold granted to the player when a wave is cleared */
  incomePerWave: z.number().positive().optional(),
});
export type TowerLevel = z.infer<typeof towerLevelSchema>;

/** Mutation effects compose from this fixed keyword menu — each keyword is
 * implemented once in the sim. All fields optional; applied on top of the
 * tower's level-3 stats. */
export const mutationEffectSchema = z.object({
  damageMult: z.number().positive().optional(),
  /** applied then rounded, min 1 tick */
  cooldownMult: z.number().positive().optional(),
  rangeAdd: z.number().optional(),
  /** kills credited to this tower pay round(bounty × mult) GOLD; score is
   * unaffected (leaderboard fairness) */
  bountyMult: z.number().min(1).optional(),
  /** projectile towers only: fire at N distinct targets (furthest-along
   * first); ignored by pulse towers */
  multishot: z.number().int().min(2).max(3).optional(),
  /** after a surviving hit, a non-boss target below this hp fraction dies
   * instantly (normal death: bounty, splits) */
  executeBelow: z.number().min(0.05).max(0.5).optional(),
  /** hits ignite: burnDps damage per second for durationTicks (refresh, no
   * stack); slowResist does not apply to burn */
  burn: z
    .object({ dps: z.number().positive(), durationTicks: z.number().int().positive() })
    .optional(),
  /** constant slow on every enemy in range while in range (re-applied each
   * tick; slowResist applies; strongest of aura/projectile slow wins) */
  auraSlow: z.object({ factor: z.number().min(0.1).max(1) }).optional(),
  incomeMult: z.number().min(1).optional(),
  /** buff aura: other towers whose tile center is within radiusTiles of this
   * tower hit damageMult× harder (multiple auras multiply; applies to
   * projectile and pulse damage at fire time) */
  towerAura: z
    .object({
      radiusTiles: z.number().positive(),
      damageMult: z.number().min(1),
    })
    .optional(),
});
export type MutationEffect = z.infer<typeof mutationEffectSchema>;

export const mutationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  /** gold, paid when the player picks the mutation at max level */
  cost: z.number().positive(),
  effect: mutationEffectSchema,
});
export type MutationDef = z.infer<typeof mutationSchema>;

export const towerDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetId: z.string(),
  description: z.string(),
  /** lifetime meta points (totalEarned) required before this tower appears
   * unlocked in the shop; 0 = available from the start */
  unlockPoints: z.number().nonnegative().default(0),
  /** "projectile" fires homing shots at one target; "pulse" emits an instant
   * burst every cooldownTicks hitting ALL enemies in range (no projectiles —
   * projectileSpeed/splashRadius/slow are ignored for pulse towers) */
  attackKind: z.enum(["projectile", "pulse"]).default("projectile"),
  levels: z.array(towerLevelSchema).min(1).max(3),
  /** exactly two branches, offered when the tower reaches max level */
  mutations: z.array(mutationSchema).length(2).optional(),
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
  /** meta-point cost of rank 1; rank r costs round(cost × costGrowth^(r−1)) */
  cost: z.number().positive(),
  /** per-rank cost escalation factor (1 = flat) */
  costGrowth: z.number().min(1).default(1),
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

/** Sägner: folklore codex entries unlocked by in-game deeds. Conditions are
 * evaluated by the app against lifetime counters tracked in the save. */
export const sagenConditionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("kills"),
    enemyTypeId: z.string(),
    count: z.number().int().positive(),
  }),
  z.object({ kind: z.literal("petrified"), count: z.number().int().positive() }),
  z.object({ kind: z.literal("winLevel"), levelId: z.string() }),
  /** win any level without losing a single life */
  z.object({ kind: z.literal("flawlessWin") }),
]);
export type SagenCondition = z.infer<typeof sagenConditionSchema>;

export const sagenSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** short folklore text in fairy-tale Swedish, revealed when unlocked */
  text: z.string(),
  condition: sagenConditionSchema,
});
export type SagenDef = z.infer<typeof sagenSchema>;

export const contentBundleSchema = z.object({
  enemies: z.array(enemyDefSchema).min(1),
  towers: z.array(towerDefSchema).min(1),
  levels: z.array(levelDefSchema).min(1),
  metaUpgrades: z.array(metaUpgradeSchema),
  sagner: z.array(sagenSchema),
  globals: globalsSchema,
});
export type ContentBundle = z.infer<typeof contentBundleSchema>;

function countChar(rows: string[], ch: string): number {
  return rows.reduce(
    (n, row) => n + row.split("").filter((c) => c === ch).length,
    0,
  );
}
