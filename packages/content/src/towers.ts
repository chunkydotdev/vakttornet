import type { TowerDef } from "./schema";

/**
 * Balance @ TICK_RATE 30. DPS per level (damage / (cooldownTicks/30)):
 *   tomte:    10.0 / 16.9 / 27.9   (cheap, fast, short range)
 *   runsten:   7.2 / 11.7 / 18.6 PER ENEMY IN RANGE — pulse (attackKind
 *              "pulse"): every cooldown the rune-lightning hits ALL väsen
 *              in range at once. Vs a 3-enemy cluster that's 21.6 / 35.2 /
 *              55.7 — past its old single-target self (14.7/24.3/39.5) the
 *              moment two or more crowd the stone. THE swarm answer.
 *   sollykta:  8.0 / 12.2 / 17.5   (long range; upgrades buy CONTROL, not
 *              damage — the petrify deepens 0.55→0.45→0.35 and lasts
 *              45→55→70 ticks while the damage curve stays flat on purpose)
 *   nacken:   19.4 / 31.9 / 52.0   sniper — top single-target DPS and the
 *              longest range on the board, but one slow shot at a time.
 *              Costs 115/135/170: the sniper pays for his range.
 *              Spend it on brutes and bosses, never on vättar.
 *   vardtradet: 0 DPS — pure economy, pays incomePerWave on each clear
 *              (range/cooldown/projectileSpeed are schema-required stubs)
 *
 * Mutations: exactly two branches per tower, offered at max level.
 * Costs sit in the 90-120g band, scaled to the tower's own price.
 */
export const towers: TowerDef[] = [
  {
    id: "tomte",
    name: "Tomten",
    assetId: "tower.tomte",
    description:
      "Liten är han, snabb och lättretad, och het julgröt slungar han mot allt som hotar gården.",
    unlockPoints: 0,
    attackKind: "projectile",
    levels: [
      { cost: 50, damage: 6, range: 2.2, cooldownTicks: 18, projectileSpeed: 9 },
      { cost: 60, damage: 9, range: 2.4, cooldownTicks: 16, projectileSpeed: 9 },
      { cost: 80, damage: 13, range: 2.6, cooldownTicks: 14, projectileSpeed: 10 },
    ],
    mutations: [
      {
        id: "tomtetvillingarna",
        name: "Tomtetvillingarna",
        description:
          "Det visar sig att tomten alltid varit två, och nu slungar bröderna gröt mot var sitt väsen.",
        cost: 90,
        effect: { multishot: 2 },
      },
      {
        id: "argbigga",
        name: "Argbigga",
        description:
          "Ingen har sett tomten så förgrymmad som nu, när grötsleven viner snabbare än ögat hinner följa.",
        cost: 90,
        effect: { cooldownMult: 0.55 },
      },
    ],
  },
  {
    id: "runsten",
    name: "Runstenen",
    assetId: "tower.runsten",
    description:
      "När de forntida runorna glöder till liv slår blixtar ur stenen och bränner allt väsen som vågar sig nära.",
    unlockPoints: 0,
    attackKind: "pulse",
    // projectileSpeed is schema-required but ignored for pulse towers.
    levels: [
      { cost: 90, damage: 12, range: 1.9, cooldownTicks: 50, projectileSpeed: 1 },
      { cost: 105, damage: 18, range: 2.1, cooldownTicks: 46, projectileSpeed: 1 },
      { cost: 145, damage: 26, range: 2.3, cooldownTicks: 42, projectileSpeed: 1 },
    ],
    mutations: [
      {
        id: "askstenen",
        name: "Åskstenen",
        description:
          "Stenen minns åskgudens hand: varje blixt slår tyngre, men runorna behöver längre tid att glöda.",
        cost: 115,
        effect: { damageMult: 1.6, cooldownMult: 1.25 },
      },
      {
        id: "offerstenen",
        name: "Offerstenen",
        description:
          "Gamla seder kräver sitt, så varje väsen som faller vid stenen lämnar rikare gåvor i guld.",
        cost: 110,
        effect: { bountyMult: 1.5 },
      },
    ],
  },
  {
    id: "sollykta",
    name: "Sollyktan",
    assetId: "tower.sollykta",
    description:
      "Lyktan bär infångat solljus långt över skogen, där väsen som träffas stelnar till sten mitt i steget.",
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
        damage: 11,
        range: 3.5,
        cooldownTicks: 27,
        projectileSpeed: 8,
        slow: { factor: 0.45, durationTicks: 55 },
      },
      {
        cost: 110,
        damage: 14,
        range: 3.8,
        cooldownTicks: 24,
        projectileSpeed: 9,
        slow: { factor: 0.35, durationTicks: 70 },
      },
    ],
    mutations: [
      {
        id: "midnattssol",
        name: "Midnattssol",
        description:
          "Aldrig mer slocknar lyktan, och ett stilla midnattsljus vilar över skogen och tynger varje steg därunder.",
        cost: 100,
        effect: { auraSlow: { factor: 0.65 } },
      },
      {
        id: "brannglas",
        name: "Brännglas",
        description:
          "En slipad lins samlar solens hetta i en enda punkt, så att den som träffas bär elden med sig genom skogen.",
        cost: 100,
        effect: { burn: { dps: 4, durationTicks: 75 } },
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
        cost: 115,
        damage: 55,
        range: 4.4,
        cooldownTicks: 85,
        projectileSpeed: 14,
      },
      {
        cost: 135,
        damage: 85,
        range: 4.8,
        cooldownTicks: 80,
        projectileSpeed: 14,
      },
      {
        cost: 170,
        damage: 130,
        range: 5.2,
        cooldownTicks: 75,
        projectileSpeed: 14,
      },
    ],
    mutations: [
      {
        id: "djupets-ton",
        name: "Djupets ton",
        description:
          "När tonen ur djupet ljuder dras de svaga under ytan utan ett ljud, hur långt de än hunnit.",
        cost: 120,
        effect: { executeBelow: 0.18 },
      },
      {
        id: "dubbelton",
        name: "Dubbelton",
        description:
          "Näcken spelar nu med båda händerna, och två väsen lockas av var sin slinga ur strömmen.",
        cost: 120,
        effect: { multishot: 2 },
      },
    ],
  },
  {
    id: "vardtradet",
    name: "Vårdträdet",
    assetId: "tower.vardtradet",
    description:
      "Det gamla trädet vid stugknuten strider aldrig, men den som vårdar det får gåvor i guld efter varje stillad våg.",
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
    mutations: [
      {
        id: "gyllene-lov",
        name: "Gyllene löv",
        description:
          "Den som vårdat trädet väl skördar rikare än någon annan när löven om hösten faller av rent guld.",
        cost: 95,
        effect: { incomeMult: 1.75 },
      },
      {
        id: "rotverk",
        name: "Rotverk",
        description:
          "Trädets rötter letar sig fram till tornen runt omkring och skänker dem skogens urgamla styrka.",
        cost: 100,
        effect: { towerAura: { radiusTiles: 2.5, damageMult: 1.2 } },
      },
    ],
  },
];
