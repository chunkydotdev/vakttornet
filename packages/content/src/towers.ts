import type { TowerDef } from "./schema";

/**
 * Balance @ TICK_RATE 30. DPS per level (damage / (cooldownTicks/30)):
 *   tomte:    10.0 / 16.9 / 27.9   (cheap, fast, short range)
 *   runsten:  14.7 / 24.3 / 39.5   (expensive, slow, heavy hits)
 *   sollykta:  8.0 / 14.4 / 23.8   (long range; ~30% less DPS than the old
 *              long-range tower — the petrifying slow pays for the difference)
 */
export const towers: TowerDef[] = [
  {
    id: "tomte",
    name: "Tomten",
    assetId: "tower.tomte",
    description:
      "Liten, snabb och lättretad — slungar het julgröt mot allt som hotar gården.",
    levels: [
      { cost: 50, damage: 6, range: 2.2, cooldownTicks: 18, projectileSpeed: 9 },
      { cost: 60, damage: 9, range: 2.4, cooldownTicks: 16, projectileSpeed: 9 },
      { cost: 80, damage: 13, range: 2.6, cooldownTicks: 14, projectileSpeed: 10 },
    ],
  },
  {
    id: "runsten",
    name: "Runstenen",
    assetId: "tower.runsten",
    description:
      "Urgammal runmagi som laddar långsamt, men varje runa slår som ett stenras.",
    levels: [
      { cost: 90, damage: 22, range: 2.0, cooldownTicks: 45, projectileSpeed: 6 },
      { cost: 100, damage: 34, range: 2.2, cooldownTicks: 42, projectileSpeed: 6 },
      { cost: 140, damage: 50, range: 2.4, cooldownTicks: 38, projectileSpeed: 7 },
    ],
  },
  {
    id: "sollykta",
    name: "Sollyktan",
    assetId: "tower.sollykta",
    description:
      "Fångat solljus med lång räckvidd — bränner milt men förstenar väsen mitt i steget.",
    levels: [
      {
        cost: 70,
        damage: 8,
        range: 3.2,
        cooldownTicks: 30,
        projectileSpeed: 8,
        slow: { factor: 0.55, durationTicks: 45 },
      },
      {
        cost: 80,
        damage: 13,
        range: 3.5,
        cooldownTicks: 27,
        projectileSpeed: 8,
        slow: { factor: 0.5, durationTicks: 55 },
      },
      {
        cost: 110,
        damage: 19,
        range: 3.8,
        cooldownTicks: 24,
        projectileSpeed: 9,
        slow: { factor: 0.45, durationTicks: 65 },
      },
    ],
  },
];
