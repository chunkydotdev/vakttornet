/**
 * The deterministic TD engine. Implements the frozen contract in types.ts.
 *
 * Event delivery model: events produced by COMMANDS (placeTower, upgradeTower,
 * sellTower, startWave) are queued and returned by the NEXT tick() call, so a
 * tick's return value is the complete, ordered record of everything that
 * happened since the previous tick. Renderers should therefore consume events
 * exclusively from tick() return values.
 */
import type {
  EnemyDef,
  MutationDef,
  MutationEffect,
  TowerDef,
  TowerLevel,
} from "@vakttornet/content";
import {
  NO_META,
  TICK_SECONDS,
  type CreateSim,
  type EnemyInstance,
  type MetaModifiers,
  type PlaceResult,
  type ProjectileInstance,
  type SimEvent,
  type SimState,
  type TowerInstance,
  type Vec,
} from "./types";
import { computePath, parseMap } from "./grid";
import { mulberry32 } from "./rng";

interface ScheduledSpawn {
  /** Ticks after the wave started; offset 0 spawns on the first tick() after startWave(). */
  offset: number;
  def: EnemyDef;
}

/** A tower's combat stats with its mutation (if any) and meta modifiers
 * applied. The modifier order is part of the documented contract:
 * - damage: base × mutation.damageMult × meta.damageMult. The towerAura
 *   product from nearby aura towers is NOT included here — it is applied on
 *   top at fire/pulse time (auras can appear/disappear between shots).
 * - range:  (base + mutation.rangeAdd) × meta.rangeMult — the flat add
 *   applies BEFORE the meta multiplier.
 * - cooldown: round(base × mutation.cooldownMult), clamped to ≥ 1 tick.
 */
interface EffectiveStats {
  damage: number;
  range: number;
  cooldownTicks: number;
}

/** auraSlow applications last 2 ticks and are re-applied every tick while
 * the enemy stays in range, so the slow lapses almost immediately (≤ 2
 * ticks) after the enemy leaves. This is keyword semantics (like "slow only
 * hits the primary target"), not a tuning number — the tunable part of the
 * keyword is its factor, which lives in content. */
const AURA_SLOW_DURATION_TICKS = 2;

export const createSim: CreateSim = (level, content, opts) => {
  const meta: MetaModifiers = opts.meta ?? NO_META;
  const globals = content.globals;

  const grid = parseMap(level.map);
  const path = computePath(grid);

  const enemyDefs = new Map<string, EnemyDef>(content.enemies.map((e) => [e.id, e]));
  const towerDefs = new Map<string, TowerDef>(content.towers.map((t) => [t.id, t]));

  // Fail fast on dangling enemy references instead of mid-run.
  level.waves.forEach((wave, wi) => {
    for (const entry of wave.entries) {
      if (!enemyDefs.has(entry.enemyTypeId)) {
        throw new Error(
          `Level "${level.id}" wave ${wi} references unknown enemy type "${entry.enemyTypeId}"`,
        );
      }
    }
  });
  for (const def of content.enemies) {
    if (def.splitsInto && !enemyDefs.has(def.splitsInto.enemyTypeId)) {
      throw new Error(
        `Enemy "${def.id}" splitsInto unknown enemy type "${def.splitsInto.enemyTypeId}"`,
      );
    }
  }
  // Mutation ids must be unique within each tower — mutateTower and the
  // renderer address branches by id, so a duplicate would be unreachable.
  for (const def of content.towers) {
    const seen = new Set<string>();
    for (const m of def.mutations ?? []) {
      if (seen.has(m.id)) {
        throw new Error(`Tower "${def.id}" has duplicate mutation id "${m.id}"`);
      }
      seen.add(m.id);
    }
  }

  // Seeded RNG — unused by current mechanics (they are fully deterministic
  // without randomness) but instantiated here so future randomized features
  // draw from the run seed. Never use Math.random in this file.
  const rng = mulberry32(opts.seed);
  void rng;

  const state: SimState = {
    status: "building",
    tick: 0,
    lives: level.startLives + meta.startLivesBonus,
    gold: level.startGold + meta.startGoldBonus,
    score: 0,
    waveIndex: 0,
    totalWaves: level.waves.length,
    grid: { cols: grid.cols, rows: grid.rows, tiles: grid.tiles },
    path,
    towers: [],
    enemies: [],
    projectiles: [],
  };

  /** Shared incrementing id counter for towers, enemies and projectiles. */
  let nextId = 1;
  /** Events produced by commands, drained and returned by the next tick(). */
  const queuedEvents: SimEvent[] = [];
  /** Spawn schedule of the active wave; offsets are sorted non-decreasing. */
  let spawnSchedule: ScheduledSpawn[] = [];
  let spawnCursor = 0;
  /** Ticks elapsed since the active wave started. */
  let waveTicks = 0;

  const tileCenter = (tile: { col: number; row: number }): Vec => ({
    x: tile.col + 0.5,
    y: tile.row + 0.5,
  });

  const levelDefOf = (tower: TowerInstance): TowerLevel =>
    towerDefs.get(tower.typeId)!.levels[tower.level - 1]!;

  /** The tower's chosen MutationDef, or undefined while unmutated. */
  const mutationOf = (tower: TowerInstance): MutationDef | undefined =>
    tower.mutationId === null
      ? undefined
      : towerDefs.get(tower.typeId)!.mutations?.find((m) => m.id === tower.mutationId);

  /** Resolve a tower's current stats — level def + mutation + meta. See the
   * EffectiveStats doc for the exact modifier order. */
  function effectiveStats(tower: TowerInstance): EffectiveStats {
    const lvl = levelDefOf(tower);
    const effect = mutationOf(tower)?.effect;
    return {
      damage: lvl.damage * (effect?.damageMult ?? 1) * meta.damageMult,
      range: (lvl.range + (effect?.rangeAdd ?? 0)) * meta.rangeMult,
      cooldownTicks: Math.max(
        1,
        Math.round(lvl.cooldownTicks * (effect?.cooldownMult ?? 1)),
      ),
    };
  }

  /** towerAura: product of `towerAura.damageMult` over every OTHER tower
   * whose aura mutation is active and whose tile center lies within
   * radiusTiles (inclusive) of this tower's tile center. Aura towers never
   * buff themselves; overlapping auras multiply. Evaluated at fire/pulse
   * time, so building or selling an aura tower affects the next shot. */
  function auraDamageMultFor(tower: TowerInstance): number {
    let mult = 1;
    const center = tileCenter(tower.tile);
    for (const other of state.towers) {
      if (other.id === tower.id) continue;
      const aura = mutationOf(other)?.effect.towerAura;
      if (!aura) continue;
      const oc = tileCenter(other.tile);
      if (Math.hypot(oc.x - center.x, oc.y - center.y) <= aura.radiusTiles) {
        mult *= aura.damageMult;
      }
    }
    return mult;
  }

  function buildSpawnSchedule(waveIdx: number): ScheduledSpawn[] {
    const wave = level.waves[waveIdx]!;
    const schedule: ScheduledSpawn[] = [];
    // delayTicks counts from the previous entry's LAST spawn (or wave start
    // for the first entry); spacingTicks separates spawns within an entry.
    let lastSpawnOffset = 0;
    for (const entry of wave.entries) {
      const start = lastSpawnOffset + entry.delayTicks;
      const def = enemyDefs.get(entry.enemyTypeId)!;
      for (let i = 0; i < entry.count; i++) {
        const offset = start + i * entry.spacingTicks;
        schedule.push({ offset, def });
        lastSpawnOffset = offset;
      }
    }
    return schedule;
  }

  /** Create an enemy of `def` at `pos` heading for path[pathIndex], add it to
   * the world and emit enemySpawned. Used by wave spawning (at path[0]) and by
   * splitsInto (at the dead parent's position). */
  function spawnEnemy(def: EnemyDef, pos: Vec, pathIndex: number, events: SimEvent[]): EnemyInstance {
    const enemy: EnemyInstance = {
      id: nextId++,
      typeId: def.id,
      pos: { ...pos },
      prevPos: { ...pos },
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      pathIndex,
      bounty: def.bounty,
      slowTicksLeft: 0,
      slowFactor: 1,
      burnTicksLeft: 0,
      burnDps: 0,
    };
    state.enemies.push(enemy);
    events.push({ type: "enemySpawned", enemyId: enemy.id, typeId: enemy.typeId });
    return enemy;
  }

  /** Remove every enemy at hp ≤ 0: pay bounty and emit enemyDied in
   * enemy-array (spawn) order for determinism, then spawn splitsInto
   * children. Shared by projectile impacts (incl. splash), pulses, burn
   * ticks and executeBelow — deaths always resolve only after ALL damage
   * from one source has been applied.
   *
   * goldMult is the bountyMult contract: GOLD paid = round(bounty × mult);
   * SCORE always adds the BASE bounty (leaderboard fairness — documented in
   * the content schema). The enemyDied event reports the gold actually
   * paid. Burn-tick deaths always use mult 1 — a burn is credited to no
   * tower, so its igniter's bountyMult only matters at hit time. */
  function resolveDeaths(events: SimEvent[], goldMult = 1): void {
    const dead = state.enemies.filter((e) => e.hp <= 0);
    if (dead.length === 0) return;
    state.enemies = state.enemies.filter((e) => e.hp > 0);
    for (const e of dead) {
      const goldPaid = Math.round(e.bounty * goldMult);
      state.gold += goldPaid;
      state.score += e.bounty;
      events.push({
        type: "enemyDied",
        enemyId: e.id,
        typeId: e.typeId,
        bounty: goldPaid,
        at: { ...e.pos },
      });
      // splitsInto: a KILLED enemy (never a leaked one) spawns children
      // at its position, continuing the parent's journey (same pathIndex,
      // fresh hp/speed/bounty, no inherited slow). enemySpawned events go
      // right after the parent's enemyDied, same tick. Because deaths
      // resolve after the movement phase, children first move next tick.
      // Splits happen before checkWaveClear, so a wave can never clear
      // while freshly split children are alive — and they chain: a child
      // with its own splitsInto splits again when killed.
      const split = enemyDefs.get(e.typeId)!.splitsInto;
      if (split) {
        const childDef = enemyDefs.get(split.enemyTypeId)!;
        for (let c = 0; c < split.count; c++) {
          spawnEnemy(childDef, e.pos, e.pathIndex, events);
        }
      }
    }
  }

  function spawnDueEnemies(events: SimEvent[]): void {
    while (
      spawnCursor < spawnSchedule.length &&
      spawnSchedule[spawnCursor]!.offset <= waveTicks
    ) {
      const { def } = spawnSchedule[spawnCursor]!;
      spawnCursor += 1;
      // Spawned at path[0], moving toward path[1].
      spawnEnemy(def, state.path[0]!, 1, events);
    }
    waveTicks += 1;
  }

  /** Move enemies along waypoints; handle leaks. Returns false if the run was lost. */
  function moveEnemies(events: SimEvent[]): boolean {
    const survivors: EnemyInstance[] = [];
    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i]!;
      const effectiveSpeed =
        enemy.speed * (enemy.slowTicksLeft > 0 ? enemy.slowFactor : 1);
      let travel = effectiveSpeed * TICK_SECONDS;
      let leaked = false;
      while (travel > 0) {
        const target = state.path[enemy.pathIndex];
        if (!target) {
          leaked = true;
          break;
        }
        const dx = target.x - enemy.pos.x;
        const dy = target.y - enemy.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > travel) {
          enemy.pos = {
            x: enemy.pos.x + (dx / dist) * travel,
            y: enemy.pos.y + (dy / dist) * travel,
          };
          travel = 0;
        } else {
          // Snap to the waypoint (absorbs float drift) and continue.
          enemy.pos = { x: target.x, y: target.y };
          travel -= dist;
          enemy.pathIndex += 1;
          if (enemy.pathIndex >= state.path.length) {
            // Reached the exit center — the enemy leaks.
            leaked = true;
            break;
          }
        }
      }
      // Decrement AFTER the slow has been applied to this tick's movement,
      // so a slow landing in the projectile phase of tick T affects the full
      // durationTicks of movement (ticks T+1 .. T+durationTicks).
      if (enemy.slowTicksLeft > 0) {
        enemy.slowTicksLeft -= 1;
        if (enemy.slowTicksLeft === 0) enemy.slowFactor = 1;
      }
      if (!leaked) {
        survivors.push(enemy);
        continue;
      }
      state.lives -= 1;
      events.push({ type: "enemyLeaked", enemyId: enemy.id, livesLeft: state.lives });
      if (state.lives <= 0) {
        state.status = "lost";
        events.push({ type: "runLost", score: state.score });
        // Freeze the rest of the world as-is: keep unprocessed enemies.
        survivors.push(...state.enemies.slice(i + 1));
        state.enemies = survivors;
        return false;
      }
    }
    state.enemies = survivors;
    return true;
  }

  /** Burn (ignite) damage-over-time: every burning enemy takes
   * burnDps × TICK_SECONDS damage per tick for burnTicksLeft ticks; expiry
   * zeroes both fields. slowResist NEVER applies to burn. Burn deaths
   * resolve through the normal death path (bounty, splits, enemyDied) but
   * are credited to no tower — bountyMult never applies (mult 1). */
  function applyBurns(events: SimEvent[]): void {
    let burned = false;
    for (const enemy of state.enemies) {
      if (enemy.burnTicksLeft <= 0) continue;
      enemy.hp -= enemy.burnDps * TICK_SECONDS;
      enemy.burnTicksLeft -= 1;
      if (enemy.burnTicksLeft === 0) enemy.burnDps = 0;
      burned = true;
    }
    if (burned) resolveDeaths(events);
  }

  /** auraSlow (any mutated tower with the keyword, attacking or not): every
   * tick, every enemy within the tower's range — rangeAdd and meta rangeMult
   * apply — is slowed by the aura's factor for AURA_SLOW_DURATION_TICKS.
   * slowResist scales the factor exactly like projectile slow (resist 1 =
   * immune: no state, no event). An aura application never overwrites a
   * strictly STRONGER (lower-factor) active slow; projectile slows keep
   * their unconditional-overwrite semantics. enemySlowed is emitted only
   * when the aura slows a previously UN-slowed enemy — the per-tick
   * re-applications while it stays in range are silent (no event spam). */
  function applyAuraSlows(events: SimEvent[]): void {
    for (const tower of state.towers) {
      const aura = mutationOf(tower)?.effect.auraSlow;
      if (!aura) continue;
      const range = effectiveStats(tower).range;
      const center = tileCenter(tower.tile);
      for (const enemy of state.enemies) {
        const d = Math.hypot(enemy.pos.x - center.x, enemy.pos.y - center.y);
        if (d > range) continue;
        const resist = enemyDefs.get(enemy.typeId)!.slowResist;
        const effectiveFactor = aura.factor + (1 - aura.factor) * resist;
        if (resist >= 1 || effectiveFactor >= 1) continue;
        if (enemy.slowTicksLeft > 0 && enemy.slowFactor < effectiveFactor) {
          continue; // an active stronger slow wins
        }
        const wasUnslowed = enemy.slowTicksLeft === 0;
        enemy.slowFactor = effectiveFactor;
        enemy.slowTicksLeft = AURA_SLOW_DURATION_TICKS;
        if (wasUnslowed) {
          events.push({
            type: "enemySlowed",
            enemyId: enemy.id,
            durationTicks: AURA_SLOW_DURATION_TICKS,
          });
        }
      }
    }
  }

  /** Pulse attack (TowerDef.attackKind "pulse"): instantly apply full damage
   * to EVERY living enemy within range — no projectiles, and the level's
   * projectileSpeed/splashRadius/slow are ignored entirely. Emits ONE
   * towerPulsed followed by the resulting deaths (resolved only after all
   * pulse damage is applied, same ordering rules as splash). With no enemy
   * in range the tower does NOT pulse and stays ready (cooldown stays 0) —
   * it never wastes a pulse on empty air.
   *
   * Mutations on a pulse tower: damageMult/cooldownMult/rangeAdd arrive via
   * EffectiveStats, the towerAura product is multiplied in here, and
   * bountyMult applies to every kill of this pulse. multishot is meaningless
   * for pulses (they already hit everything in range) and burn/executeBelow
   * are projectile-hit semantics — all three are ignored here. */
  function firePulse(
    tower: TowerInstance,
    stats: EffectiveStats,
    center: Vec,
    effect: MutationEffect | undefined,
    events: SimEvent[],
  ): void {
    const hit = state.enemies.filter(
      (e) => Math.hypot(e.pos.x - center.x, e.pos.y - center.y) <= stats.range,
    );
    if (hit.length === 0) return;
    const damage = stats.damage * auraDamageMultFor(tower);
    for (const enemy of hit) enemy.hp -= damage;
    events.push({
      type: "towerPulsed",
      towerId: tower.id,
      range: stats.range,
      hitCount: hit.length,
    });
    resolveDeaths(events, effect?.bountyMult ?? 1);
    tower.cooldown = stats.cooldownTicks;
  }

  function towersFire(events: SimEvent[]): void {
    for (const tower of state.towers) {
      const lvl = levelDefOf(tower);
      // damage 0 = non-attacking tower (e.g. income): it never targets or
      // fires. Skipped before cooldown handling so even a tower carrying
      // stale cooldown state (e.g. upgraded into a damage-0 level) stays
      // inert while its current level deals no damage. Applies to both
      // attack kinds — a damage-0 pulse tower never pulses.
      if (lvl.damage === 0) continue;
      if (tower.cooldown > 0) tower.cooldown -= 1;
      if (tower.cooldown > 0) continue;
      const stats = effectiveStats(tower);
      const effect = mutationOf(tower)?.effect;
      const center = tileCenter(tower.tile);

      if (towerDefs.get(tower.typeId)!.attackKind === "pulse") {
        firePulse(tower, stats, center, effect, events);
        continue;
      }

      // Rank in-range enemies by the furthest-along ordering: highest
      // pathIndex, tie-break by smallest distance to the next waypoint, then
      // lowest id (the enemies array is in spawn = id order and the sort is
      // stable, so full ties keep array order).
      const candidates: Array<{ enemy: EnemyInstance; nextDist: number }> = [];
      for (const enemy of state.enemies) {
        const d = Math.hypot(enemy.pos.x - center.x, enemy.pos.y - center.y);
        if (d > stats.range) continue;
        const next = state.path[enemy.pathIndex];
        const nextDist = next ? Math.hypot(next.x - enemy.pos.x, next.y - enemy.pos.y) : 0;
        candidates.push({ enemy, nextDist });
      }
      if (candidates.length === 0) continue;
      candidates.sort(
        (a, b) => b.enemy.pathIndex - a.enemy.pathIndex || a.nextDist - b.nextDist,
      );
      // multishot (projectile towers only): one shot fires at up to N
      // DISTINCT targets — the top N of the ranking above. Fewer enemies in
      // range → fewer projectiles; a target is never doubled up. Each
      // projectile gets its own towerFired event.
      const targets = candidates.slice(0, effect?.multishot ?? 1);

      // Aura buffs resolve once per shot, at fire time.
      const damage = stats.damage * auraDamageMultFor(tower);
      for (const { enemy } of targets) {
        const projectile: ProjectileInstance = {
          id: nextId++,
          pos: { ...center },
          prevPos: { ...center },
          targetEnemyId: enemy.id,
          speed: lvl.projectileSpeed,
          damage,
          towerTypeId: tower.typeId,
        };
        if (lvl.slow) {
          // Copy the values onto the projectile. Meta modifiers (damageMult,
          // rangeMult) intentionally do not touch the slow payload.
          projectile.slow = {
            factor: lvl.slow.factor,
            durationTicks: lvl.slow.durationTicks,
          };
        }
        if (lvl.splashRadius !== undefined) {
          projectile.splashRadius = lvl.splashRadius;
        }
        // Mutation payloads ride on the projectile (copied at fire time,
        // like slow/splash) and resolve when it lands.
        if (effect?.burn) {
          projectile.burn = {
            dps: effect.burn.dps,
            durationTicks: effect.burn.durationTicks,
          };
        }
        if (effect?.executeBelow !== undefined) {
          projectile.executeBelow = effect.executeBelow;
        }
        if (effect?.bountyMult !== undefined) {
          projectile.bountyMult = effect.bountyMult;
        }
        state.projectiles.push(projectile);
        events.push({ type: "towerFired", towerId: tower.id, projectileId: projectile.id });
      }
      tower.cooldown = stats.cooldownTicks;
    }
  }

  function moveProjectiles(events: SimEvent[]): void {
    const remaining: ProjectileInstance[] = [];
    for (const proj of state.projectiles) {
      const target = state.enemies.find((e) => e.id === proj.targetEnemyId);
      if (!target) continue; // target already dead/removed — despawn silently
      const travel = proj.speed * TICK_SECONDS;
      const dx = target.pos.x - proj.pos.x;
      const dy = target.pos.y - proj.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= travel) {
        // Hit. The impact point is the primary target's position; splash
        // (if any) measures from here.
        const impact: Vec = { ...target.pos };
        target.hp -= proj.damage;
        events.push({
          type: "projectileHit",
          projectileId: proj.id,
          enemyId: target.id,
          damage: proj.damage,
          at: { ...impact },
          ...(proj.splashRadius !== undefined
            ? { splashRadius: proj.splashRadius }
            : {}),
        });
        // Splash: every OTHER living enemy within splashRadius tiles of the
        // impact takes the same damage (flat, no falloff).
        if (proj.splashRadius !== undefined) {
          for (const enemy of state.enemies) {
            if (enemy.id === target.id) continue;
            const d = Math.hypot(enemy.pos.x - impact.x, enemy.pos.y - impact.y);
            if (d <= proj.splashRadius) enemy.hp -= proj.damage;
          }
        }
        // Deaths resolve only after ALL damage from this impact has been
        // applied (primary + splash). Splash kills pay the same (bountyMult-
        // adjusted) bounty as the primary — the whole impact is one credit.
        const goldMult = proj.bountyMult ?? 1;
        resolveDeaths(events, goldMult);
        // Slow and the mutation payloads (burn, executeBelow) apply ONLY to
        // the primary target — splash victims are never slowed, burned or
        // executed — and only if the primary survived the impact.
        if (target.hp > 0) {
          if (proj.slow) {
            // slowResist scales the factor toward 1:
            //   effective = factor + (1 − factor) × resist.
            // resist 1 (effective factor 1) means immune: no slow state and no
            // enemySlowed event — an immune enemy shows no petrify at all.
            // Partial resist keeps the payload's full durationTicks.
            const resist = enemyDefs.get(target.typeId)!.slowResist;
            const effectiveFactor =
              proj.slow.factor + (1 - proj.slow.factor) * resist;
            if (resist < 1 && effectiveFactor < 1) {
              // Overwrite semantics: a new application replaces both factor and
              // duration — no stacking, no taking the stronger of the two.
              target.slowFactor = effectiveFactor;
              target.slowTicksLeft = proj.slow.durationTicks;
              events.push({
                type: "enemySlowed",
                enemyId: target.id,
                durationTicks: proj.slow.durationTicks,
              });
            }
          }
          if (proj.burn) {
            // Ignite: refresh, no stack — a new application overwrites the
            // dps and resets the remaining duration. Damage ticks in
            // applyBurns starting next tick. slowResist does not apply.
            target.burnDps = proj.burn.dps;
            target.burnTicksLeft = proj.burn.durationTicks;
          }
          if (
            proj.executeBelow !== undefined &&
            target.hp / target.maxHp < proj.executeBelow &&
            !enemyDefs.get(target.typeId)!.boss
          ) {
            // executeBelow: a surviving non-boss strictly below the hp
            // fraction dies through the NORMAL death path — bounty (with
            // this projectile's bountyMult), splits, enemyDied event.
            target.hp = 0;
            resolveDeaths(events, goldMult);
          }
        }
      } else {
        proj.pos = {
          x: proj.pos.x + (dx / dist) * travel,
          y: proj.pos.y + (dy / dist) * travel,
        };
        remaining.push(proj);
      }
    }
    state.projectiles = remaining;
  }

  function checkWaveClear(events: SimEvent[]): void {
    if (state.status !== "wave") return;
    if (spawnCursor < spawnSchedule.length) return; // still spawning
    if (state.enemies.length > 0) return;
    // waveIndex was incremented at startWave, so the just-cleared wave is
    // waveIndex - 1 and its bonus is (clearedIndex + 1) * bonusPerWave.
    const clearedIndex = state.waveIndex - 1;
    const bonus = (clearedIndex + 1) * globals.waveClearBonusPerWave;
    state.score += bonus;
    state.status = "building";
    events.push({ type: "waveCleared", waveIndex: clearedIndex, bonus });
    // Income towers pay out on EVERY wave clear — including the final one,
    // where runWon fires in the same tick (consistent: the last wave cleared
    // is still a cleared wave). Income is gold only; it never adds to score.
    // Events go after waveCleared (and before runWon), same tick.
    for (const tower of state.towers) {
      const income = levelDefOf(tower).incomePerWave;
      if (income === undefined) continue;
      // incomeMult: a mutated income tower pays round(income × mult) gold.
      const amount = Math.round(income * (mutationOf(tower)?.effect.incomeMult ?? 1));
      state.gold += amount;
      events.push({ type: "income", towerId: tower.id, amount });
    }
    if (state.waveIndex >= state.totalWaves) {
      state.status = "won";
      state.score += state.lives * globals.winBonusPerLife;
      events.push({ type: "runWon", score: state.score });
    }
  }

  function tick(): SimEvent[] {
    // A finished run is frozen: tick() is a no-op. (Commands are rejected in
    // won/lost, so the queue cannot hold undelivered events here.)
    if (state.status === "won" || state.status === "lost") return [];

    const events: SimEvent[] = queuedEvents.splice(0);
    state.tick += 1;

    // 1. Snapshot prevPos for all moving entities (renderer interpolation).
    for (const e of state.enemies) e.prevPos = { ...e.pos };
    for (const p of state.projectiles) p.prevPos = { ...p.pos };

    // 2. Spawn due enemies for the active wave.
    if (state.status === "wave") spawnDueEnemies(events);

    // 3. Move enemies; leaks may end the run.
    if (!moveEnemies(events)) return events;

    // 3b. Mutation tick effects on fresh positions: burn DoT first, then
    // aura slows — a burn-killed enemy is gone before the aura pass and is
    // never slowed posthumously.
    applyBurns(events);
    applyAuraSlows(events);

    // 4. Towers target & fire.
    towersFire(events);

    // 5. Move projectiles; hits, deaths, bounties.
    moveProjectiles(events);

    // 6. Wave clear / win.
    checkWaveClear(events);

    return events;
  }

  function placeTower(typeId: string, tile: { col: number; row: number }): PlaceResult {
    // Contract: placement is not allowed once the run is won/lost. The
    // PlaceResult reason enum has no "wrong-status" value; we report
    // "not-buildable" — nothing is buildable after the run ends.
    if (state.status === "won" || state.status === "lost") {
      return { ok: false, reason: "not-buildable" };
    }
    const def = towerDefs.get(typeId);
    if (!def) return { ok: false, reason: "unknown-tower" };
    const kind = state.grid.tiles[tile.row]?.[tile.col];
    if (kind !== "buildable") return { ok: false, reason: "not-buildable" };
    if (state.towers.some((t) => t.tile.col === tile.col && t.tile.row === tile.row)) {
      return { ok: false, reason: "occupied" };
    }
    const cost = def.levels[0]!.cost;
    if (state.gold < cost) return { ok: false, reason: "insufficient-gold" };

    state.gold -= cost;
    const tower: TowerInstance = {
      id: nextId++,
      typeId,
      tile: { col: tile.col, row: tile.row },
      level: 1,
      cooldown: 0,
      mutationId: null,
    };
    state.towers.push(tower);
    queuedEvents.push({ type: "towerPlaced", towerId: tower.id });
    return { ok: true, tower };
  }

  function upgradeTower(towerId: number): boolean {
    if (state.status === "won" || state.status === "lost") return false;
    const tower = state.towers.find((t) => t.id === towerId);
    if (!tower) return false;
    const def = towerDefs.get(tower.typeId)!;
    // tower.level is 1-based, so the next level's def sits at index `level`.
    const nextLevel = def.levels[tower.level];
    if (!nextLevel) return false; // already max level
    if (state.gold < nextLevel.cost) return false;

    state.gold -= nextLevel.cost;
    tower.level += 1;
    queuedEvents.push({ type: "towerUpgraded", towerId: tower.id, level: tower.level });
    return true;
  }

  /** Pick a mutation at max level. Once per tower; the mutation must belong
   * to this tower's def; costs MutationDef.cost gold. Like every command,
   * rejected after the run ends, and the towerMutated event is queued for
   * the next tick(). */
  function mutateTower(towerId: number, mutationId: string): boolean {
    if (state.status === "won" || state.status === "lost") return false;
    const tower = state.towers.find((t) => t.id === towerId);
    if (!tower) return false;
    const def = towerDefs.get(tower.typeId)!;
    // Covers both "unknown mutation id" and "belongs to another tower type"
    // (and towers whose def offers no mutations at all).
    const mutation = def.mutations?.find((m) => m.id === mutationId);
    if (!mutation) return false;
    if (tower.level !== def.levels.length) return false; // max level only
    if (tower.mutationId !== null) return false; // once per tower
    if (state.gold < mutation.cost) return false;

    state.gold -= mutation.cost;
    tower.mutationId = mutationId;
    queuedEvents.push({ type: "towerMutated", towerId: tower.id, mutationId });
    return true;
  }

  function sellTower(towerId: number): boolean {
    if (state.status === "won" || state.status === "lost") return false;
    const index = state.towers.findIndex((t) => t.id === towerId);
    if (index === -1) return false;
    const tower = state.towers[index]!;
    const def = towerDefs.get(tower.typeId)!;
    // "Total spent" includes the mutation cost, so a mutated tower refunds
    // its share of that gold too.
    const spent =
      def.levels.slice(0, tower.level).reduce((sum, lvl) => sum + lvl.cost, 0) +
      (mutationOf(tower)?.cost ?? 0);
    const refund = Math.floor(globals.sellRefundRatio * spent);

    state.towers.splice(index, 1);
    state.gold += refund;
    queuedEvents.push({ type: "towerSold", towerId: tower.id, refund });
    return true;
  }

  function startWave(): boolean {
    if (state.status !== "building" || state.waveIndex >= state.totalWaves) {
      return false;
    }
    spawnSchedule = buildSpawnSchedule(state.waveIndex);
    spawnCursor = 0;
    waveTicks = 0;
    state.status = "wave";
    queuedEvents.push({ type: "waveStarted", waveIndex: state.waveIndex });
    state.waveIndex += 1; // waveIndex = NEXT wave to start
    return true;
  }

  return { state, tick, placeTower, upgradeTower, mutateTower, sellTower, startWave };
};
