import type { TowerDef } from "./schema";

/**
 * First-pass balance @ TICK_RATE 30.
 * DPS per level (damage / (cooldownTicks/30)):
 *   arrow:    10.0 / 16.9 / 27.9   (cheap, fast, short range)
 *   cannon:   14.7 / 24.3 / 39.5   (expensive, slow, heavy hits)
 *   crossbow: 12.0 / 20.0 / 33.8   (mid cost, long range, mid speed)
 */
export const towers: TowerDef[] = [
  {
    id: "arrow",
    name: "Arrow Tower",
    assetId: "tower.arrow",
    description: "Cheap and quick. Peppers nearby enemies with arrows.",
    levels: [
      { cost: 50, damage: 6, range: 2.2, cooldownTicks: 18, projectileSpeed: 9 },
      { cost: 60, damage: 9, range: 2.4, cooldownTicks: 16, projectileSpeed: 9 },
      { cost: 80, damage: 13, range: 2.6, cooldownTicks: 14, projectileSpeed: 10 },
    ],
  },
  {
    id: "cannon",
    name: "Cannon Tower",
    assetId: "tower.cannon",
    description: "Slow to reload, but each shot hits like a falling boulder.",
    levels: [
      { cost: 90, damage: 22, range: 2.0, cooldownTicks: 45, projectileSpeed: 6 },
      { cost: 100, damage: 34, range: 2.2, cooldownTicks: 42, projectileSpeed: 6 },
      { cost: 140, damage: 50, range: 2.4, cooldownTicks: 38, projectileSpeed: 7 },
    ],
  },
  {
    id: "crossbow",
    name: "Crossbow Tower",
    assetId: "tower.crossbow",
    description: "Long reach and steady aim. Picks off enemies from afar.",
    levels: [
      { cost: 70, damage: 12, range: 3.2, cooldownTicks: 30, projectileSpeed: 8 },
      { cost: 80, damage: 18, range: 3.5, cooldownTicks: 27, projectileSpeed: 8 },
      { cost: 110, damage: 27, range: 3.8, cooldownTicks: 24, projectileSpeed: 9 },
    ],
  },
];
