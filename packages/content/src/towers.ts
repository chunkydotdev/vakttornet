import type { TowerDef } from "./schema";

/**
 * Balance @ TICK_RATE 30. DPS per level (damage / (cooldownTicks/30)):
 *   tomte:    10.0 / 16.9 / 27.9   (cheap, fast, short range)
 *   runsten:  14.7 / 24.3 / 39.5   (expensive, slow, heavy hits)
 *   sollykta:  8.0 / 14.4 / 23.8   (long range; ~30% less DPS than the old
 *              long-range tower — the petrifying slow pays for the difference)
 *   nacken:   10.5 / 15.8 / 23.3   single-target — deliberately below
 *              Runstenen, because splash repeats the full hit on every
 *              enemy within the radius (vs swarms it multiplies hard)
 *   vardtradet: 0 DPS — pure economy, pays incomePerWave on each clear
 *              (range/cooldown/projectileSpeed are schema-required stubs)
 */
export const towers: TowerDef[] = [
  {
    id: "tomte",
    name: "Tomten",
    assetId: "tower.tomte",
    description:
      "Liten, snabb och lättretad — slungar het julgröt mot allt som hotar gården.",
    unlockPoints: 0,
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
    unlockPoints: 0,
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
    unlockPoints: 0,
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
  {
    id: "nacken",
    name: "Näcken",
    assetId: "tower.nacken",
    description:
      "Spelar fiol så ljuvt att väsen glömmer vägen — tills vågen bryter och drar dem alla med sig.",
    unlockPoints: 300,
    levels: [
      {
        cost: 85,
        damage: 14,
        range: 2.4,
        cooldownTicks: 40,
        projectileSpeed: 7,
        splashRadius: 0.9,
      },
      {
        cost: 95,
        damage: 20,
        range: 2.6,
        cooldownTicks: 38,
        projectileSpeed: 7,
        splashRadius: 1.0,
      },
      {
        cost: 130,
        damage: 28,
        range: 2.8,
        cooldownTicks: 36,
        projectileSpeed: 7,
        splashRadius: 1.1,
      },
    ],
  },
  {
    id: "vardtradet",
    name: "Vårdträdet",
    assetId: "tower.vardtradet",
    description:
      "Det gamla trädet vid stugknuten strider aldrig — men den som vårdar det får igen med ränta, var kväll, vid varje stillad våg.",
    unlockPoints: 800,
    levels: [
      {
        cost: 60,
        damage: 0,
        range: 1,
        cooldownTicks: 1,
        projectileSpeed: 1,
        incomePerWave: 12,
      },
      {
        cost: 70,
        damage: 0,
        range: 1,
        cooldownTicks: 1,
        projectileSpeed: 1,
        incomePerWave: 20,
      },
      {
        cost: 90,
        damage: 0,
        range: 1,
        cooldownTicks: 1,
        projectileSpeed: 1,
        incomePerWave: 30,
      },
    ],
  },
];
