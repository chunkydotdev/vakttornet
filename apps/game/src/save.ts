/**
 * Save system — zod-validated localStorage persistence for meta progression.
 *
 * - `points` is the spendable meta-point balance.
 * - `totalEarned` is the lifetime score total; it only ever grows and drives
 *   level + tower unlocks (unlocked when totalEarned >= unlockPoints).
 * - `upgradeRanks` maps meta-upgrade id -> purchased rank.
 * - `deeds` holds lifetime deed counters that unlock sägner codex entries.
 *
 * Versioning: the payload carries a `version` field. v1 saves (pre-deeds)
 * migrate forward on load with zeroed counters — points/totalEarned/
 * upgradeRanks are preserved untouched. A corrupt or missing save degrades
 * gracefully to a fresh one.
 */
import { z } from "zod";
import type { MetaUpgradeDef } from "@vakttornet/content";
import { NO_META, type MetaModifiers } from "@vakttornet/sim";

/** Historical key name — the `version` field inside the payload is the
 * source of truth, the key never changes so old saves keep loading. */
export const SAVE_KEY = "vakttornet.save.v1";

const deedCountersSchema = z.object({
  /** lifetime kills per enemy type id */
  kills: z.record(z.string(), z.number().int().nonnegative()),
  /** lifetime petrify (slow) applications */
  petrifiedCount: z.number().int().nonnegative(),
  /** ids of levels won at least once */
  wonLevelIds: z.array(z.string()),
  /** wins without losing a single life */
  flawlessWins: z.number().int().nonnegative(),
});

export type DeedCounters = z.infer<typeof deedCountersSchema>;

const saveSchemaV1 = z.object({
  version: z.literal(1),
  points: z.number().nonnegative(),
  totalEarned: z.number().nonnegative(),
  upgradeRanks: z.record(z.string(), z.number().int().nonnegative()),
});

const saveSchemaV2 = z.object({
  version: z.literal(2),
  points: z.number().nonnegative(),
  totalEarned: z.number().nonnegative(),
  upgradeRanks: z.record(z.string(), z.number().int().nonnegative()),
  deeds: deedCountersSchema,
  /** last name used on the leaderboard — optional, so pre-existing v2 saves
   * keep parsing without a version bump */
  playerName: z.string().optional(),
});

export type SaveData = z.infer<typeof saveSchemaV2>;

export function zeroDeeds(): DeedCounters {
  return { kills: {}, petrifiedCount: 0, wonLevelIds: [], flawlessWins: 0 };
}

export function freshSave(): SaveData {
  return { version: 2, points: 0, totalEarned: 0, upgradeRanks: {}, deeds: zeroDeeds() };
}

/** v1 → v2: keep all progression, start deed counters from zero. */
function migrateV1(old: z.infer<typeof saveSchemaV1>): SaveData {
  return {
    version: 2,
    points: old.points,
    totalEarned: old.totalEarned,
    upgradeRanks: old.upgradeRanks,
    deeds: zeroDeeds(),
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw === null) return freshSave();
    const data: unknown = JSON.parse(raw);
    const v2 = saveSchemaV2.safeParse(data);
    if (v2.success) return v2.data;
    const v1 = saveSchemaV1.safeParse(data);
    if (v1.success) return migrateV1(v1.data);
    return freshSave();
  } catch {
    return freshSave();
  }
}

export function persistSave(save: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage may be unavailable (private mode, quota) — the run still works,
    // progression just won't stick.
  }
}

/** What one finished run contributed to the lifetime deed counters. */
export interface RunDeeds {
  /** kills this run, per enemy type id */
  kills: Record<string, number>;
  /** petrify applications this run */
  petrified: number;
  /** the level id if the run was won, else null */
  wonLevelId: string | null;
  /** won without losing a single life */
  flawless: boolean;
}

/** Fold one run's deeds into the lifetime counters (pure — no persistence). */
export function mergeDeeds(deeds: DeedCounters, run: RunDeeds): DeedCounters {
  const kills = { ...deeds.kills };
  for (const [typeId, count] of Object.entries(run.kills)) {
    kills[typeId] = (kills[typeId] ?? 0) + count;
  }
  return {
    kills,
    petrifiedCount: deeds.petrifiedCount + run.petrified,
    wonLevelIds:
      run.wonLevelId !== null && !deeds.wonLevelIds.includes(run.wonLevelId)
        ? [...deeds.wonLevelIds, run.wonLevelId]
        : deeds.wonLevelIds,
    flawlessWins: deeds.flawlessWins + (run.flawless ? 1 : 0),
  };
}

/** Run ended (won OR lost): the run score becomes spendable + lifetime
 * points, and the run's deeds fold into the lifetime counters. */
export function applyRunEnd(save: SaveData, score: number, run: RunDeeds): SaveData {
  const next: SaveData = {
    ...save,
    points: save.points + score,
    totalEarned: save.totalEarned + score,
    deeds: mergeDeeds(save.deeds, run),
  };
  persistSave(next);
  return next;
}

/** Remember the last-used leaderboard name so the win screen can prefill it. */
export function setPlayerName(save: SaveData, playerName: string): SaveData {
  const next: SaveData = { ...save, playerName };
  persistSave(next);
  return next;
}

/** Meta-point cost of the NEXT rank when `ownedRank` ranks are already
 * bought: round(cost × costGrowth^ownedRank). The first rank (ownedRank 0)
 * costs exactly `cost`; with costGrowth 1 every rank stays flat. */
export function nextUpgradeCost(upgrade: MetaUpgradeDef, ownedRank: number): number {
  return Math.round(upgrade.cost * Math.pow(upgrade.costGrowth, ownedRank));
}

/** Returns the updated save, or null if the upgrade can't be bought. */
export function buyUpgrade(save: SaveData, upgrade: MetaUpgradeDef): SaveData | null {
  const rank = save.upgradeRanks[upgrade.id] ?? 0;
  if (rank >= upgrade.maxRank) return null;
  const cost = nextUpgradeCost(upgrade, rank);
  if (save.points < cost) return null;
  const next: SaveData = {
    ...save,
    points: save.points - cost,
    upgradeRanks: { ...save.upgradeRanks, [upgrade.id]: rank + 1 },
  };
  persistSave(next);
  return next;
}

/**
 * Fold purchased upgrade ranks into the MetaModifiers shape the sim expects.
 * Multiplier kinds add `value × rank` on top of 1; flat kinds sum `value × rank`.
 */
export function computeMetaModifiers(
  upgradeRanks: Record<string, number>,
  metaUpgrades: MetaUpgradeDef[],
): MetaModifiers {
  const meta: MetaModifiers = { ...NO_META };
  for (const upgrade of metaUpgrades) {
    const rank = upgradeRanks[upgrade.id] ?? 0;
    if (rank <= 0) continue;
    const total = upgrade.effect.value * rank;
    switch (upgrade.effect.kind) {
      case "damageMult":
        meta.damageMult += total;
        break;
      case "rangeMult":
        meta.rangeMult += total;
        break;
      case "startGold":
        meta.startGoldBonus += total;
        break;
      case "startLives":
        meta.startLivesBonus += total;
        break;
    }
  }
  return meta;
}
