/**
 * THE SIM CONTRACT — frozen. The renderer (apps/game) and the engine
 * implementation both code against this file. If implementing forces a
 * deviation, flag it — don't silently change shapes.
 *
 * Design rules:
 * - The sim is pure and deterministic: same level + seed + command sequence
 *   ⇒ identical state. No Date.now(), no Math.random() (use the seeded RNG).
 * - Fixed timestep: tick() advances exactly TICK_SECONDS. The renderer calls
 *   it from an accumulator loop and interpolates between prevPos and pos.
 * - Positions are in TILE space (1.0 = one tile). Tile (col,row) has its
 *   center at (col + 0.5, row + 0.5). The renderer multiplies by pixel size.
 * - One-way flow: the renderer reads state and calls command methods. It
 *   never mutates state directly.
 */
import type { LevelDef, ContentBundle } from "@vakttornet/content";

export const TICK_RATE = 30;
export const TICK_SECONDS = 1 / TICK_RATE;

export interface Vec {
  x: number;
  y: number;
}

export type TileKind =
  | "buildable"
  | "blocked"
  | "path"
  | "spawn"
  | "exit"
  | "water";

/** Map characters in LevelDef.map rows. Water behaves like blocked
 * (unbuildable, unwalkable) and only differs visually. */
export const TILE_CHARS: Record<string, TileKind> = {
  ".": "buildable",
  "#": "blocked",
  P: "path",
  S: "spawn",
  E: "exit",
  "~": "water",
};

export type RunStatus = "building" | "wave" | "won" | "lost";

export interface EnemyInstance {
  id: number;
  typeId: string;
  pos: Vec;
  prevPos: Vec;
  hp: number;
  maxHp: number;
  /** tiles per second */
  speed: number;
  /** index into SimState.path of the waypoint currently moving toward */
  pathIndex: number;
  bounty: number;
  /** slow (petrify) effect: while slowTicksLeft > 0, effective speed =
   * speed × slowFactor. A new application overwrites factor and duration. */
  slowTicksLeft: number;
  slowFactor: number;
}

export interface TowerInstance {
  id: number;
  typeId: string;
  tile: { col: number; row: number };
  /** 1-based; max = TowerDef.levels.length */
  level: number;
  /** ticks until it may fire again */
  cooldown: number;
}

export interface ProjectileInstance {
  id: number;
  pos: Vec;
  prevPos: Vec;
  targetEnemyId: number;
  /** tiles per second */
  speed: number;
  damage: number;
  /** slow payload applied on hit (from TowerLevel.slow), if any */
  slow?: { factor: number; durationTicks: number };
  /** splash radius in tiles (from TowerLevel.splashRadius): on hit, full
   * damage to every enemy within this radius of the impact */
  splashRadius?: number;
  /** asset of the tower type that fired it, for rendering */
  towerTypeId: string;
}

export interface SimState {
  status: RunStatus;
  tick: number;
  lives: number;
  gold: number;
  /** run score — becomes meta points when the run ends */
  score: number;
  /** index of the NEXT wave to start (0-based). Equal to waves.length when all done. */
  waveIndex: number;
  totalWaves: number;
  grid: { cols: number; rows: number; tiles: TileKind[][] };
  /** tile-center waypoints from spawn to exit, inclusive */
  path: Vec[];
  towers: TowerInstance[];
  enemies: EnemyInstance[];
  projectiles: ProjectileInstance[];
}

export type SimEvent =
  | { type: "waveStarted"; waveIndex: number }
  | { type: "waveCleared"; waveIndex: number; bonus: number }
  | { type: "enemySpawned"; enemyId: number; typeId: string }
  | { type: "enemyDied"; enemyId: number; typeId: string; bounty: number; at: Vec }
  | { type: "enemyLeaked"; enemyId: number; livesLeft: number }
  | { type: "towerFired"; towerId: number; projectileId: number }
  | { type: "towerPulsed"; towerId: number; range: number; hitCount: number }
  | { type: "projectileHit"; projectileId: number; enemyId: number; damage: number; at: Vec; splashRadius?: number }
  | { type: "enemySlowed"; enemyId: number; durationTicks: number }
  | { type: "income"; towerId: number; amount: number }
  | { type: "towerPlaced"; towerId: number }
  | { type: "towerUpgraded"; towerId: number; level: number }
  | { type: "towerSold"; towerId: number; refund: number }
  | { type: "runWon"; score: number }
  | { type: "runLost"; score: number };

export type PlaceResult =
  | { ok: true; tower: TowerInstance }
  | { ok: false; reason: "occupied" | "not-buildable" | "insufficient-gold" | "unknown-tower" };

/** Permanent (meta) upgrade effects applied to a run at creation. */
export interface MetaModifiers {
  damageMult: number; // 1 = no bonus
  rangeMult: number; // 1 = no bonus
  startGoldBonus: number; // flat gold added
  startLivesBonus: number; // flat lives added
}

export const NO_META: MetaModifiers = {
  damageMult: 1,
  rangeMult: 1,
  startGoldBonus: 0,
  startLivesBonus: 0,
};

export interface Sim {
  readonly state: SimState;
  /** Advance one fixed step. Returns the events that happened during it. */
  tick(): SimEvent[];
  /** Buy + place a level-1 tower. Allowed in any status except won/lost. */
  placeTower(typeId: string, tile: { col: number; row: number }): PlaceResult;
  /** Pay the next level's cost. False if max level / not enough gold / unknown id. */
  upgradeTower(towerId: number): boolean;
  /** Refund = sellRefundRatio × total gold spent on the tower. */
  sellTower(towerId: number): boolean;
  /** Start the next wave. False unless status is "building" and waves remain. */
  startWave(): boolean;
}

export interface CreateSimOptions {
  seed: number;
  meta?: MetaModifiers;
}

export type CreateSim = (
  level: LevelDef,
  content: ContentBundle,
  opts: CreateSimOptions,
) => Sim;
