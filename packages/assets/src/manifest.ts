/**
 * Asset id → resolved URL. Imports `.svg?url`, so ONLY the Vite app may
 * import this module (node test runners must import the package root).
 */
import type { AssetId } from "./ids";

import tileGrass from "../svg/tile-grass.svg?url";
import tilePath from "../svg/tile-path.svg?url";
import tileBlocked from "../svg/tile-blocked.svg?url";
import tileSpawn from "../svg/tile-spawn.svg?url";
import tileExit from "../svg/tile-exit.svg?url";
import towerArrow from "../svg/tower-arrow.svg?url";
import towerCannon from "../svg/tower-cannon.svg?url";
import towerCrossbow from "../svg/tower-crossbow.svg?url";
import projectileArrow from "../svg/projectile-arrow.svg?url";
import projectileCannon from "../svg/projectile-cannon.svg?url";
import projectileCrossbow from "../svg/projectile-crossbow.svg?url";
import enemyRunner from "../svg/enemy-runner.svg?url";
import enemyBrute from "../svg/enemy-brute.svg?url";
import enemySwarm from "../svg/enemy-swarm.svg?url";
import uiHeart from "../svg/ui-heart.svg?url";
import uiCoin from "../svg/ui-coin.svg?url";

export const manifest: Record<AssetId, string> = {
  "tile.grass": tileGrass,
  "tile.path": tilePath,
  "tile.blocked": tileBlocked,
  "tile.spawn": tileSpawn,
  "tile.exit": tileExit,
  "tower.arrow": towerArrow,
  "tower.cannon": towerCannon,
  "tower.crossbow": towerCrossbow,
  "projectile.arrow": projectileArrow,
  "projectile.cannon": projectileCannon,
  "projectile.crossbow": projectileCrossbow,
  "enemy.runner": enemyRunner,
  "enemy.brute": enemyBrute,
  "enemy.swarm": enemySwarm,
  "ui.heart": uiHeart,
  "ui.coin": uiCoin,
};
