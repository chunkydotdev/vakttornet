import type { TowerDef } from "./schema";

/**
 * Balance @ TICK_RATE 30. DPS per level (damage / (cooldownTicks/30)):
 *   tomte:    10.0 / 16.9 / 27.9   (cheap, fast, short range)
 *   runsten:   7.2 / 11.7 / 18.6 PER ENEMY IN RANGE — pulse (attackKind
 *              "pulse"): every cooldown the rune-lightning hits ALL väsen
 *              in range at once. Vs a 3-enemy cluster that's 21.6 / 35.2 /
 *              55.7 — past its old single-target self (14.7/24.3/39.5) the
 *              moment two or more crowd the stone. THE swarm answer.
 *   sollykta:  8.0 / 14.4 / 23.8   (long range; ~30% less DPS than the old
 *              long-range tower — the petrifying slow pays for the difference)
 *   nacken:   19.4 / 31.9 / 52.0   sniper — top single-target DPS and the
 *              longest range on the board, but one slow shot at a time.
 *              Spend it on brutes and bosses, never on vättar.
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
    attackKind: "projectile",
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
      "Forntida runor glöder till liv — blixtar slår ur stenen och bränner allt väsen som vågar sig nära.",
    unlockPoints: 0,
    attackKind: "pulse",
    // projectileSpeed is schema-required but ignored for pulse towers.
    levels: [
      { cost: 90, damage: 12, range: 1.9, cooldownTicks: 50, projectileSpeed: 1 },
      { cost: 105, damage: 18, range: 2.1, cooldownTicks: 46, projectileSpeed: 1 },
      { cost: 145, damage: 26, range: 2.3, cooldownTicks: 42, projectileSpeed: 1 },
    ],
  },
  {
    id: "sollykta",
    name: "Sollyktan",
    assetId: "tower.sollykta",
    description:
      "Lyktan bär infångat solljus långt över skogen — väsen som träffas stelnar till sten mitt i steget.",
    unlockPoints: 0,
    attackKind: "projectile",
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
      "Näcken spelar en enda ton över vattnet — ett väsen lockas ur ledet och dras under ytan.",
    unlockPoints: 300,
    attackKind: "projectile",
    levels: [
      {
        cost: 100,
        damage: 55,
        range: 4.4,
        cooldownTicks: 85,
        projectileSpeed: 14,
      },
      {
        cost: 115,
        damage: 85,
        range: 4.8,
        cooldownTicks: 80,
        projectileSpeed: 14,
      },
      {
        cost: 150,
        damage: 130,
        range: 5.2,
        cooldownTicks: 75,
        projectileSpeed: 14,
      },
    ],
  },
  {
    id: "vardtradet",
    name: "Vårdträdet",
    assetId: "tower.vardtradet",
    description:
      "Det gamla trädet vid stugknuten strider aldrig — men den som vårdar det får gåvor i guld efter varje stillad våg.",
    unlockPoints: 800,
    // never attacks (damage 0) — attackKind is a required-field formality
    attackKind: "projectile",
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
