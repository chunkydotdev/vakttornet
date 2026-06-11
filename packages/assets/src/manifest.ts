/**
 * Asset id → resolved URL. Imports `.svg?url`, so ONLY the Vite app may
 * import this module (vitest in sim/content must import the package root).
 */
import type { AssetId } from "./ids";

import tileGrass from "../svg/tile-grass.svg?url";
import tilePath from "../svg/tile-path.svg?url";
import tileBlocked from "../svg/tile-blocked.svg?url";
import tileSpawn from "../svg/tile-spawn.svg?url";
import tileExit from "../svg/tile-exit.svg?url";
import towerTomte from "../svg/tower-tomte.svg?url";
import towerRunsten from "../svg/tower-runsten.svg?url";
import towerSollykta from "../svg/tower-sollykta.svg?url";
import projectileTomte from "../svg/projectile-tomte.svg?url";
import projectileRunsten from "../svg/projectile-runsten.svg?url";
import projectileSollykta from "../svg/projectile-sollykta.svg?url";
import enemyMyling from "../svg/enemy-myling.svg?url";
import enemyVatte from "../svg/enemy-vatte.svg?url";
import enemyTroll from "../svg/enemy-troll.svg?url";
import uiHeart from "../svg/ui-heart.svg?url";
import uiCoin from "../svg/ui-coin.svg?url";

export const manifest: Record<AssetId, string> = {
  "tile.grass": tileGrass,
  "tile.path": tilePath,
  "tile.blocked": tileBlocked,
  "tile.spawn": tileSpawn,
  "tile.exit": tileExit,
  "tower.tomte": towerTomte,
  "tower.runsten": towerRunsten,
  "tower.sollykta": towerSollykta,
  "projectile.tomte": projectileTomte,
  "projectile.runsten": projectileRunsten,
  "projectile.sollykta": projectileSollykta,
  "enemy.myling": enemyMyling,
  "enemy.vatte": enemyVatte,
  "enemy.troll": enemyTroll,
  "ui.heart": uiHeart,
  "ui.coin": uiCoin,
};
