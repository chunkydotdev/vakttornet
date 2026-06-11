/**
 * Sound layer — intentionally a stub. One no-op function per sim event type
 * so real sounds can be dropped in later without touching the call sites.
 * The run screen feeds every tick's event batch through `playEventSounds`.
 */
import type { SimEvent } from "@vakttornet/sim";

export function sfxWaveStarted(): void {}
export function sfxWaveCleared(): void {}
export function sfxEnemySpawned(): void {}
export function sfxEnemyDied(): void {}
export function sfxEnemyLeaked(): void {}
export function sfxTowerFired(): void {}
export function sfxProjectileHit(): void {}
export function sfxEnemySlowed(): void {}
export function sfxIncome(): void {}
export function sfxTowerPlaced(): void {}
export function sfxTowerUpgraded(): void {}
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
        sfxEnemySpawned();
        break;
      case "enemyDied":
        sfxEnemyDied();
        break;
      case "enemyLeaked":
        sfxEnemyLeaked();
        break;
      case "towerFired":
        sfxTowerFired();
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
