import type { EnemyDef } from "./schema";

export const enemies: EnemyDef[] = [
  {
    id: "myling",
    name: "Myling",
    assetId: "enemy.myling",
    hp: 30,
    speed: 1.6,
    bounty: 5,
  },
  {
    id: "vatte",
    name: "Vätte",
    assetId: "enemy.vatte",
    hp: 12,
    speed: 2.3,
    bounty: 2,
  },
  {
    id: "troll",
    name: "Troll",
    assetId: "enemy.troll",
    hp: 140,
    speed: 0.7,
    bounty: 14,
  },
];
