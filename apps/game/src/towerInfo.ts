/**
 * Pure helpers deriving Swedish, player-facing mechanic copy from tower
 * content data. Numbers are NEVER hand-written here — everything is computed
 * from TowerDef/TowerLevel so content tuning stays the single source of
 * truth. Decimal separator is the Swedish comma.
 */
import { TICK_RATE, type MetaModifiers } from "@vakttornet/sim";
import type { TowerDef, TowerLevel } from "@vakttornet/content";

/** Always one decimal, Swedish comma: 1.6667 → "1,7". */
export function formatSv1(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** Integers plain, otherwise one decimal with Swedish comma: 9 → "9", 2.4 → "2,4". */
export function formatSv(value: number): string {
  return Number.isInteger(value) ? String(value) : formatSv1(value);
}

export function shotsPerSecond(level: TowerLevel): number {
  return TICK_RATE / level.cooldownTicks;
}

/** Damage per second; pass the meta damage multiplier to match displayed damage. */
export function dps(level: TowerLevel, damageMult = 1): number {
  return level.damage * damageMult * shotsPerSecond(level);
}

/** Economy tower (damage 0) — never targets or fires, so attack stats are
 * meaningless and must not be shown. */
export function isEconomy(level: TowerLevel): boolean {
  return level.damage === 0;
}

/** One-word role chip, derived from level-1 data — never hand-assigned. */
export function roleBadge(def: TowerDef): string {
  const l1 = def.levels[0]!;
  if (l1.incomePerWave !== undefined) return "Inkomst";
  if (l1.slow) return "Förstenar";
  if (l1.splashRadius !== undefined) return "Stänk";
  return l1.cooldownTicks <= 20 ? "Snabb" : "Tung";
}

/** Special-mechanic lines (petrify / splash / income) for one tower level. */
export function mechanicLines(level: TowerLevel): string[] {
  const lines: string[] = [];
  if (level.slow) {
    const pct = Math.round((1 - level.slow.factor) * 100);
    const secs = formatSv1(level.slow.durationTicks / TICK_RATE);
    lines.push(`Förstenar: fiender rör sig ${pct} % långsammare i ${secs} s`);
  }
  if (level.splashRadius !== undefined) {
    lines.push(
      `Stänkskada: full skada på alla fiender inom ${formatSv(level.splashRadius)} rutor av nedslaget`,
    );
  }
  if (level.incomePerWave !== undefined) {
    lines.push(`Ger +${formatSv(level.incomePerWave)} guld efter varje klarad våg. Anfaller inte.`);
  }
  return lines;
}

/**
 * Compact upgrade one-liner — "Nivå 2 — 60g: skada 9, räckvidd 2,4" — for
 * levels past the first. Meta multipliers apply to displayed damage/range
 * exactly like the placed-tower inspector. Returns null for level 1.
 */
export function upgradeLine(
  def: TowerDef,
  levelIndex: number,
  meta: MetaModifiers,
): string | null {
  const level = def.levels[levelIndex];
  if (!level || levelIndex === 0) return null;
  const head = `Nivå ${levelIndex + 1} — ${level.cost}g: `;
  if (isEconomy(level)) return `${head}+${formatSv(level.incomePerWave ?? 0)} guld per våg`;
  return (
    head +
    `skada ${formatSv(level.damage * meta.damageMult)}, ` +
    `räckvidd ${formatSv(level.range * meta.rangeMult)}`
  );
}
