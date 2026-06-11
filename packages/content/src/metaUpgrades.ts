import type { MetaUpgradeDef } from "./schema";

export const metaUpgrades: MetaUpgradeDef[] = [
  {
    id: "sharper-arrows",
    name: "Sharper Arrows",
    description: "Every tower hits 10% harder. The blacksmith sends his regards.",
    cost: 80,
    maxRank: 3,
    effect: { kind: "damageMult", value: 0.1 },
  },
  {
    id: "eagle-eyes",
    name: "Eagle Eyes",
    description: "Every tower sees 10% farther. Nothing sneaks past.",
    cost: 100,
    maxRank: 2,
    effect: { kind: "rangeMult", value: 0.1 },
  },
  {
    id: "war-chest",
    name: "War Chest",
    description: "Start each run with +40 gold. Build first, worry later.",
    cost: 60,
    maxRank: 3,
    effect: { kind: "startGold", value: 40 },
  },
  {
    id: "stone-walls",
    name: "Stone Walls",
    description: "Start each run with +2 lives. The keep holds a little longer.",
    cost: 120,
    maxRank: 2,
    effect: { kind: "startLives", value: 2 },
  },
];
