/**
 * Stable asset ids. Game code and content data reference art ONLY through
 * these ids — replacing placeholder art never requires a code change.
 */
export const ASSET_IDS = [
  "tile.grass",
  "tile.path",
  "tile.blocked",
  "tile.spawn",
  "tile.exit",
  "tower.tomte",
  "tower.runsten",
  "tower.sollykta",
  "projectile.tomte",
  "projectile.runsten",
  "projectile.sollykta",
  "enemy.myling",
  "enemy.vatte",
  "enemy.troll",
  "ui.heart",
  "ui.coin",
] as const;

export type AssetId = (typeof ASSET_IDS)[number];
