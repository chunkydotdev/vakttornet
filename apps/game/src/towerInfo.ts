/**
 * Pure helpers deriving player-facing mechanic copy from tower content data.
 * Numbers are NEVER hand-written here — everything is computed from
 * TowerDef/TowerLevel so content tuning stays the single source of truth.
 *
 * All strings come from i18n templates via `tr()` (module-level current
 * language) and all numbers are locale-formatted (Swedish comma / English
 * point). React screens re-render on a language switch, so these recompute.
 */
import { TICK_RATE, type MetaModifiers } from "@vakttornet/sim";
import type { MutationEffect, TowerDef, TowerLevel } from "@vakttornet/content";
import { formatNum, formatNum1, tr } from "./i18n";

export { formatNum, formatNum1, formatSilver } from "./i18n";

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

/** Range at/above which a projectile tower counts as a sniper. */
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
  if (l1.incomePerWave !== undefined) return tr("roleIncome");
  if (isPulse(def)) return tr("roleLightning");
  if (l1.slow) return tr("rolePetrifies");
  if (l1.splashRadius !== undefined) return tr("roleSplash");
  if (l1.range >= SNIPER_RANGE) return tr("roleSniper");
  return l1.cooldownTicks <= 20 ? tr("roleFast") : tr("roleHeavy");
}

/** Stat-row label for the firing-rate row: pulse towers pulse, others shoot. */
export function rateLabel(def: TowerDef): string {
  return isPulse(def) ? tr("rateLabelPulse") : tr("rateLabelFire");
}

/** Firing-rate stat value with unit: "1,7 skott/s" or "0,7 pulser/s". */
export function rateValue(def: TowerDef, level: TowerLevel): string {
  const r = formatNum1(shotsPerSecond(level));
  return isPulse(def) ? tr("ratePulses", { r }) : tr("rateShots", { r });
}

/** Damage stat value; pulse damage applies to every enemy in range at once. */
export function damageValue(def: TowerDef, level: TowerLevel, damageMult = 1): string {
  const damage = formatNum(level.damage * damageMult);
  return isPulse(def) ? tr("damageAllInRange", { d: damage }) : damage;
}

/** DPS stat value; for pulse towers the figure is per enemy hit. */
export function dpsValue(def: TowerDef, level: TowerLevel, damageMult = 1): string {
  const value = formatNum1(dps(level, damageMult));
  return isPulse(def) ? tr("dpsPerEnemy", { v: value }) : value;
}

/** Special-mechanic lines (pulse / petrify / splash / income) for one tower
 * level. Pulse towers never show slow/splash lines — the sim ignores those
 * fields for them (content schema contract). */
export function mechanicLines(def: TowerDef, level: TowerLevel): string[] {
  const lines: string[] = [];
  if (isPulse(def)) {
    lines.push(tr("mechPulse"));
  } else {
    if (level.slow) {
      lines.push(
        tr("mechPetrify", {
          pct: Math.round((1 - level.slow.factor) * 100),
          secs: formatNum1(level.slow.durationTicks / TICK_RATE),
        }),
      );
    }
    if (level.splashRadius !== undefined) {
      lines.push(tr("mechSplash", { r: formatNum(level.splashRadius) }));
    }
  }
  if (level.incomePerWave !== undefined) {
    lines.push(tr("mechIncome", { n: formatNum(level.incomePerWave) }));
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
 * Player-facing lines for a mutation's effect — one line per keyword in the
 * effect object, in schema order. Every number is computed from the effect
 * data; nothing is hand-written per mutation, so this works for any
 * tower/mutation id the content ships.
 */
export function mutationEffectLines(effect: MutationEffect): string[] {
  const lines: string[] = [];
  if (effect.damageMult !== undefined) {
    lines.push(tr("mutDamageMult", { m: formatNum(effect.damageMult) }));
  }
  if (effect.cooldownMult !== undefined) {
    // Shown as the fire-rate multiplier the player actually feels:
    // cooldown ×0,55 ⇒ rate ×1,8.
    lines.push(tr("mutFireRate", { m: formatNum(1 / effect.cooldownMult) }));
  }
  if (effect.rangeAdd !== undefined && effect.rangeAdd !== 0) {
    const abs = Math.abs(effect.rangeAdd);
    const params = { sign: effect.rangeAdd > 0 ? "+" : "−", n: formatNum(abs) };
    lines.push(abs === 1 ? tr("mutRangeTileOne", params) : tr("mutRangeTileMany", params));
  }
  if (effect.bountyMult !== undefined) {
    lines.push(tr("mutBounty", { p: pctDelta(effect.bountyMult) }));
  }
  if (effect.multishot !== undefined) {
    lines.push(tr("mutMultishot", { n: effect.multishot }));
  }
  if (effect.executeBelow !== undefined) {
    lines.push(tr("mutExecute", { p: Math.round(effect.executeBelow * 100) }));
  }
  if (effect.burn) {
    lines.push(
      tr("mutBurn", {
        dps: formatNum(effect.burn.dps),
        secs: formatNum(effect.burn.durationTicks / TICK_RATE),
      }),
    );
  }
  if (effect.auraSlow) {
    lines.push(tr("mutAuraSlow", { p: pctSlower(effect.auraSlow.factor) }));
  }
  if (effect.incomeMult !== undefined) {
    lines.push(tr("mutIncome", { p: pctDelta(effect.incomeMult) }));
  }
  if (effect.towerAura) {
    lines.push(
      tr("mutTowerAura", {
        p: pctDelta(effect.towerAura.damageMult),
        r: formatNum(effect.towerAura.radiusTiles),
      }),
    );
  }
  return lines;
}

/** Shop-hover teaser for towers that offer mutations at max level, or null. */
export function mutationTeaser(def: TowerDef): string | null {
  if (!def.mutations || def.mutations.length === 0) return null;
  return tr("mutationTeaser", { n: def.levels.length });
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
  const n = levelIndex + 1;
  if (isEconomy(level)) {
    return tr("upgradeLineEconomy", { n, c: level.cost, i: formatNum(level.incomePerWave ?? 0) });
  }
  return tr("upgradeLineStats", {
    n,
    c: level.cost,
    d: formatNum(level.damage * meta.damageMult),
    r: formatNum(level.range * meta.rangeMult),
  });
}
