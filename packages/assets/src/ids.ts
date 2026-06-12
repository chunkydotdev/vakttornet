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
  "tile.water",
  "tower.tomte",
  "tower.runsten",
  "tower.sollykta",
  "tower.nacken",
  "tower.vardtradet",
  "projectile.tomte",
  "projectile.runsten",
  "projectile.sollykta",
  "projectile.nacken",
  "enemy.myling",
  "enemy.vatte",
  "enemy.troll",
  "enemy.skuggvarg",
  "enemy.kyrkogrim",
  "enemy.backahast",
  "enemy.stentroll",
  "enemy.trollyngel",
  "enemy.skattvatte",
  "enemy.vattekungen",
  "enemy.trollmodern",
  "enemy.sjoraet",
  "enemy.gruvkungen",
  "enemy.isfursten",
  "enemy.skogsraet",
  "ui.heart",
  "ui.coin",
] as const;

export type AssetId = (typeof ASSET_IDS)[number];
