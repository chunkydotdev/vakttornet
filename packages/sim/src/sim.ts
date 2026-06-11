/**
 * The deterministic TD engine. Implements the frozen contract in types.ts.
 *
 * Event delivery model: events produced by COMMANDS (placeTower, upgradeTower,
 * sellTower, startWave) are queued and returned by the NEXT tick() call, so a
 * tick's return value is the complete, ordered record of everything that
 * happened since the previous tick. Renderers should therefore consume events
 * exclusively from tick() return values.
 */
import type { EnemyDef, TowerDef, TowerLevel } from "@vakttornet/content";
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

  function spawnDueEnemies(events: SimEvent[]): void {
    while (
      spawnCursor < spawnSchedule.length &&
      spawnSchedule[spawnCursor]!.offset <= waveTicks
    ) {
      const { def } = spawnSchedule[spawnCursor]!;
      spawnCursor += 1;
      const start = state.path[0]!;
      const enemy: EnemyInstance = {
        id: nextId++,
        typeId: def.id,
        pos: { ...start },
        prevPos: { ...start },
        hp: def.hp,
        maxHp: def.hp,
        speed: def.speed,
        pathIndex: 1, // spawned at path[0], moving toward path[1]
        bounty: def.bounty,
      };
      state.enemies.push(enemy);
      events.push({ type: "enemySpawned", enemyId: enemy.id, typeId: enemy.typeId });
    }
    waveTicks += 1;
  }

  /** Move enemies along waypoints; handle leaks. Returns false if the run was lost. */
  function moveEnemies(events: SimEvent[]): boolean {
    const survivors: EnemyInstance[] = [];
    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i]!;
      let travel = enemy.speed * TICK_SECONDS;
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

  function towersFire(events: SimEvent[]): void {
    for (const tower of state.towers) {
      if (tower.cooldown > 0) tower.cooldown -= 1;
      if (tower.cooldown > 0) continue;
      const lvl = levelDefOf(tower);
      const range = lvl.range * meta.rangeMult;
      const center = tileCenter(tower.tile);

      // Target the in-range enemy furthest along the path: highest pathIndex,
      // tie-break by smallest distance to its next waypoint, then lowest id.
      let best: EnemyInstance | undefined;
      let bestNextDist = Infinity;
      for (const enemy of state.enemies) {
        const d = Math.hypot(enemy.pos.x - center.x, enemy.pos.y - center.y);
        if (d > range) continue;
        const next = state.path[enemy.pathIndex];
        const nextDist = next ? Math.hypot(next.x - enemy.pos.x, next.y - enemy.pos.y) : 0;
        if (
          best === undefined ||
          enemy.pathIndex > best.pathIndex ||
          (enemy.pathIndex === best.pathIndex && nextDist < bestNextDist)
          // Equal pathIndex + equal nextDist: keep `best` — enemies are
          // iterated in spawn order, so it already has the lowest id.
        ) {
          best = enemy;
          bestNextDist = nextDist;
        }
      }
      if (!best) continue;

      const projectile: ProjectileInstance = {
        id: nextId++,
        pos: { ...center },
        prevPos: { ...center },
        targetEnemyId: best.id,
        speed: lvl.projectileSpeed,
        damage: lvl.damage * meta.damageMult,
        towerTypeId: tower.typeId,
      };
      state.projectiles.push(projectile);
      tower.cooldown = lvl.cooldownTicks;
      events.push({ type: "towerFired", towerId: tower.id, projectileId: projectile.id });
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
        // Hit.
        target.hp -= proj.damage;
        events.push({
          type: "projectileHit",
          projectileId: proj.id,
          enemyId: target.id,
          damage: proj.damage,
          at: { ...target.pos },
        });
        if (target.hp <= 0) {
          state.enemies = state.enemies.filter((e) => e.id !== target.id);
          state.gold += target.bounty;
          state.score += target.bounty;
          events.push({
            type: "enemyDied",
            enemyId: target.id,
            typeId: target.typeId,
            bounty: target.bounty,
            at: { ...target.pos },
          });
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

  function sellTower(towerId: number): boolean {
    if (state.status === "won" || state.status === "lost") return false;
    const index = state.towers.findIndex((t) => t.id === towerId);
    if (index === -1) return false;
    const tower = state.towers[index]!;
    const def = towerDefs.get(tower.typeId)!;
    const spent = def.levels
      .slice(0, tower.level)
      .reduce((sum, lvl) => sum + lvl.cost, 0);
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

  return { state, tick, placeTower, upgradeTower, sellTower, startWave };
};
