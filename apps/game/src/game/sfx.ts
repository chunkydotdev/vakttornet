/**
 * Sound layer — intentionally a stub. One no-op function per sim event type
 * so real sounds can be dropped in later without touching the call sites.
 * The run screen feeds every tick's event batch through `playEventSounds`.
 */
import type { SimEvent } from "@vakttornet/sim";
import { content } from "../content";

/** Enemy type ids flagged `boss: true` in content — boss sfx are derived
 * from spawn/death events, not separate sim event types. */
const bossTypeIds: ReadonlySet<string> = new Set(
  content.enemies.filter((e) => e.boss).map((e) => e.id),
);

export function sfxWaveStarted(): void {}
export function sfxWaveCleared(): void {}
export function sfxEnemySpawned(): void {}
export function sfxEnemyDied(): void {}
export function sfxBossSpawned(): void {}
export function sfxBossDied(): void {}
export function sfxEnemyLeaked(): void {}
export function sfxTowerFired(): void {}
export function sfxTowerPulsed(): void {}
export function sfxProjectileHit(): void {}
export function sfxEnemySlowed(): void {}
export function sfxIncome(): void {}
export function sfxTowerPlaced(): void {}
export function sfxTowerUpgraded(): void {}
export function sfxTowerMutated(): void {}
export function sfxTowerSold(): void {}
export function sfxRunWon(): void {}
export function sfxRunLost(): void {}

export function playEventSounds(events: SimEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case "waveStarted":
        sfxWaveStarted();
        break;
      case "waveCleared":
        sfxWaveCleared();
        break;
      case "enemySpawned":
        if (bossTypeIds.has(event.typeId)) sfxBossSpawned();
        else sfxEnemySpawned();
        break;
      case "enemyDied":
        if (bossTypeIds.has(event.typeId)) sfxBossDied();
        else sfxEnemyDied();
        break;
      case "enemyLeaked":
        sfxEnemyLeaked();
        break;
      case "towerFired":
        sfxTowerFired();
        break;
      case "towerPulsed":
        sfxTowerPulsed();
        break;
      case "projectileHit":
        sfxProjectileHit();
        break;
      case "enemySlowed":
        sfxEnemySlowed();
        break;
      case "income":
        sfxIncome();
        break;
      case "towerPlaced":
        sfxTowerPlaced();
        break;
      case "towerUpgraded":
        sfxTowerUpgraded();
        break;
      case "towerMutated":
        sfxTowerMutated();
        break;
      case "towerSold":
        sfxTowerSold();
        break;
      case "runWon":
        sfxRunWon();
        break;
      case "runLost":
        sfxRunLost();
        break;
    }
  }
}
