import type { MetaUpgradeDef } from "./schema";

export const metaUpgrades: MetaUpgradeDef[] = [
  {
    id: "bjornstyrka",
    name: "Björnstyrka",
    description: "Varje torn slår 10 % hårdare. Med björnens kraft i timret.",
    cost: 80,
    maxRank: 3,
    effect: { kind: "damageMult", value: 0.1 },
  },
  {
    id: "ugglesyn",
    name: "Ugglesyn",
    description: "Varje torn ser 10 % längre. Ugglan i granen missar ingenting.",
    cost: 100,
    maxRank: 2,
    effect: { kind: "rangeMult", value: 0.1 },
  },
  {
    id: "skattkista",
    name: "Skattkista",
    description: "Börja varje försvar med +40 guld. Gammalt trollsilver, nyputsat.",
    cost: 60,
    maxRank: 3,
    effect: { kind: "startGold", value: 40 },
  },
  {
    id: "stugvarme",
    name: "Stugvärme",
    description: "Börja varje försvar med +2 liv. Brasan brinner, modet håller.",
    cost: 120,
    maxRank: 2,
    effect: { kind: "startLives", value: 2 },
  },
];
