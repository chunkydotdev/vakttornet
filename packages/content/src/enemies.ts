import type { EnemyDef } from "./schema";

export const enemies: EnemyDef[] = [
  {
    id: "runner",
    name: "Runner",
    assetId: "enemy.runner",
    hp: 30,
    speed: 1.6,
    bounty: 5,
  },
  {
    id: "brute",
    name: "Brute",
    assetId: "enemy.brute",
    hp: 140,
    speed: 0.7,
    bounty: 14,
  },
  {
    id: "swarm",
    name: "Swarmling",
    assetId: "enemy.swarm",
    hp: 12,
    speed: 2.3,
    bounty: 2,
  },
];
