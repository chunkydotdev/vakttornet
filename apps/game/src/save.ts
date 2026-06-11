/**
 * Save system — zod-validated localStorage persistence for meta progression.
 *
 * - `points` is the spendable meta-point balance.
 * - `totalEarned` is the lifetime score total; it only ever grows and drives
 *   level unlocks (a level is unlocked when totalEarned >= unlockPoints).
 * - `upgradeRanks` maps meta-upgrade id -> purchased rank.
 *
 * A corrupt or missing save degrades gracefully to a fresh one.
 */
import { z } from "zod";
import type { MetaUpgradeDef } from "@vakttornet/content";
import { NO_META, type MetaModifiers } from "@vakttornet/sim";

export const SAVE_KEY = "vakttornet.save.v1";

const saveSchema = z.object({
  version: z.literal(1),
  points: z.number().nonnegative(),
  totalEarned: z.number().nonnegative(),
  upgradeRanks: z.record(z.string(), z.number().int().nonnegative()),
});

export type SaveData = z.infer<typeof saveSchema>;

export function freshSave(): SaveData {
  return { version: 1, points: 0, totalEarned: 0, upgradeRanks: {} };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw === null) return freshSave();
    return saveSchema.parse(JSON.parse(raw));
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

/** Run ended (won OR lost): the run score becomes spendable + lifetime points. */
export function applyRunEnd(save: SaveData, score: number): SaveData {
  const next: SaveData = {
    ...save,
    points: save.points + score,
    totalEarned: save.totalEarned + score,
  };
  persistSave(next);
  return next;
}

/** Returns the updated save, or null if the upgrade can't be bought. */
export function buyUpgrade(save: SaveData, upgrade: MetaUpgradeDef): SaveData | null {
  const rank = save.upgradeRanks[upgrade.id] ?? 0;
  if (rank >= upgrade.maxRank) return null;
  if (save.points < upgrade.cost) return null;
  const next: SaveData = {
    ...save,
    points: save.points - upgrade.cost,
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
