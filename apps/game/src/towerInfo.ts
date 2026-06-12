/**
 * Pure helpers deriving Swedish, player-facing mechanic copy from tower
 * content data. Numbers are NEVER hand-written here — everything is computed
 * from TowerDef/TowerLevel so content tuning stays the single source of
 * truth. Decimal separator is the Swedish comma.
 */
import { TICK_RATE, type MetaModifiers } from "@vakttornet/sim";
import type { MutationEffect, TowerDef, TowerLevel } from "@vakttornet/content";

/** Always one decimal, Swedish comma: 1.6667 → "1,7". */
export function formatSv1(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** Integers plain, otherwise one decimal with Swedish comma: 9 → "9", 2.4 → "2,4". */
export function formatSv(value: number): string {
  return Number.isInteger(value) ? String(value) : formatSv1(value);
}

/** Whole trollsilver amounts with Swedish thousands grouping (non-breaking
 * space): 1114 → "1 114". Used everywhere the meta currency is displayed. */
export function formatSilver(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

export function shotsPerSecond(level: TowerLevel): number {
  return TICK_RATE / level.cooldownTicks;
}

/** Damage per second; pass the meta damage multiplier to match displayed damage.
 * For pulse towers this is per enemy hit (every enemy in range takes it). */
export function dps(level: TowerLevel, damageMult = 1): number {
  return level.damage * damageMult * shotsPerSecond(level);
}

/** Economy tower (damage 0) — never targets or fires, so attack stats are
 * meaningless and must not be shown. */
export function isEconomy(level: TowerLevel): boolean {
  return level.damage === 0;
}

/** Pulse tower — instant burst hitting ALL enemies in range, no projectiles. */
export function isPulse(def: TowerDef): boolean {
  return def.attackKind === "pulse";
}

/** Range at/above which a projectile tower counts as a sniper ("Prickskytt"). */
const SNIPER_RANGE = 4;

/**
 * One-word role chip, derived from data — never hand-assigned.
 * Precedence: Inkomst > Blixt > Förstenar > Stänk > Prickskytt > Snabb/Tung.
 * Blixt outranks Förstenar/Stänk because the sim ignores slow/splash on pulse
 * towers (see the content schema) — those badges would lie. Prickskytt only
 * applies to projectile towers (pulse range is its hit area, not sniping).
 */
export function roleBadge(def: TowerDef): string {
  const l1 = def.levels[0]!;
  if (l1.incomePerWave !== undefined) return "Inkomst";
  if (isPulse(def)) return "Blixt";
  if (l1.slow) return "Förstenar";
  if (l1.splashRadius !== undefined) return "Stänk";
  if (l1.range >= SNIPER_RANGE) return "Prickskytt";
  return l1.cooldownTicks <= 20 ? "Snabb" : "Tung";
}

/** Stat-row label for the firing-rate row: pulse towers pulse, others shoot. */
export function rateLabel(def: TowerDef): string {
  return isPulse(def) ? "Pulstakt" : "Eldtakt";
}

/** Firing-rate stat value with unit: "1,7 skott/s" or "0,7 pulser/s". */
export function rateValue(def: TowerDef, level: TowerLevel): string {
  return `${formatSv1(shotsPerSecond(level))} ${isPulse(def) ? "pulser/s" : "skott/s"}`;
}

/** Damage stat value; pulse damage applies to every enemy in range at once. */
export function damageValue(def: TowerDef, level: TowerLevel, damageMult = 1): string {
  const damage = formatSv(level.damage * damageMult);
  return isPulse(def) ? `${damage} (alla inom räckvidd)` : damage;
}

/** DPS stat value; for pulse towers the figure is per enemy hit. */
export function dpsValue(def: TowerDef, level: TowerLevel, damageMult = 1): string {
  const value = formatSv1(dps(level, damageMult));
  return isPulse(def) ? `${value} per fiende` : value;
}

/** Special-mechanic lines (pulse / petrify / splash / income) for one tower
 * level. Pulse towers never show slow/splash lines — the sim ignores those
 * fields for them (content schema contract). */
export function mechanicLines(def: TowerDef, level: TowerLevel): string[] {
  const lines: string[] = [];
  if (isPulse(def)) {
    lines.push("Blixtpuls: träffar ALLA fiender inom räckvidd samtidigt");
  } else {
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
  }
  if (level.incomePerWave !== undefined) {
    lines.push(`Ger +${formatSv(level.incomePerWave)} guld efter varje klarad våg. Anfaller inte.`);
  }
  return lines;
}

/** Percent delta from a multiplier, rounded: 1.75 → 75, 0.7 → −30. */
function pctDelta(mult: number): number {
  return Math.round((mult - 1) * 100);
}

/** Percent slowdown from a slow factor, rounded: 0.7 → 30. */
function pctSlower(factor: number): number {
  return Math.round((1 - factor) * 100);
}

/**
 * Player-facing Swedish lines for a mutation's effect — one line per keyword
 * in the effect object, in schema order. Every number is computed from the
 * effect data (Swedish comma decimals); nothing is hand-written per mutation,
 * so this works for any tower/mutation id the content ships.
 */
export function mutationEffectLines(effect: MutationEffect): string[] {
  const lines: string[] = [];
  if (effect.damageMult !== undefined) {
    lines.push(`Skada ×${formatSv(effect.damageMult)}`);
  }
  if (effect.cooldownMult !== undefined) {
    // Shown as the fire-rate multiplier the player actually feels:
    // cooldown ×0,55 ⇒ rate ×1,8.
    lines.push(`Eldtakt ×${formatSv(1 / effect.cooldownMult)}`);
  }
  if (effect.rangeAdd !== undefined && effect.rangeAdd !== 0) {
    const abs = Math.abs(effect.rangeAdd);
    const sign = effect.rangeAdd > 0 ? "+" : "−";
    lines.push(`Räckvidd ${sign}${formatSv(abs)} ${abs === 1 ? "ruta" : "rutor"}`);
  }
  if (effect.bountyMult !== undefined) {
    lines.push(`+${pctDelta(effect.bountyMult)} % guld från egna dråp`);
  }
  if (effect.multishot !== undefined) {
    lines.push(`Skjuter mot ${effect.multishot} mål samtidigt`);
  }
  if (effect.executeBelow !== undefined) {
    lines.push(`Avrättar väsen under ${Math.round(effect.executeBelow * 100)} % hälsa (ej bossar)`);
  }
  if (effect.burn) {
    const secs = formatSv(effect.burn.durationTicks / TICK_RATE);
    lines.push(`Antänder: ${formatSv(effect.burn.dps)} skada/s i ${secs} s`);
  }
  if (effect.auraSlow) {
    lines.push(
      `Aura: allt inom räckvidd rör sig ${pctSlower(effect.auraSlow.factor)} % långsammare`,
    );
  }
  if (effect.incomeMult !== undefined) {
    lines.push(`+${pctDelta(effect.incomeMult)} % inkomst`);
  }
  if (effect.towerAura) {
    lines.push(
      `Närliggande torn slår ${pctDelta(effect.towerAura.damageMult)} % hårdare ` +
        `(inom ${formatSv(effect.towerAura.radiusTiles)} rutor)`,
    );
  }
  return lines;
}

/** Shop-hover teaser for towers that offer mutations at max level, or null. */
export function mutationTeaser(def: TowerDef): string | null {
  if (!def.mutations || def.mutations.length === 0) return null;
  return `Nivå ${def.levels.length}: välj en av två utvecklingar`;
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
