import type { EnemyDef } from "./schema";

export const enemies: EnemyDef[] = [
  {
    id: "myling",
    name: "Myling",
    assetId: "enemy.myling",
    hp: 30,
    speed: 1.6,
    bounty: 5,
    scale: 1,
    boss: false,
    slowResist: 0,
  },
  {
    id: "vatte",
    name: "Vätte",
    assetId: "enemy.vatte",
    hp: 12,
    speed: 2.3,
    bounty: 2,
    scale: 1,
    boss: false,
    slowResist: 0,
  },
  {
    id: "troll",
    name: "Troll",
    assetId: "enemy.troll",
    hp: 140,
    speed: 0.7,
    bounty: 14,
    scale: 1,
    boss: false,
    slowResist: 0,
  },
  {
    // Fast flanker — debuts on level04. Quicker than mylingen, twice the
    // hide. Punishes thin early coverage on long serpentines.
    id: "skuggvarg",
    name: "Skuggvarg",
    assetId: "enemy.skuggvarg",
    hp: 55,
    speed: 2.0,
    bounty: 7,
    scale: 1,
    boss: false,
    slowResist: 0,
  },
  {
    // Guardian ghost from the churchyard — mostly shrugs off Sollyktans
    // petrify (slowResist 0.7). The answer is raw damage, not stalling.
    id: "kyrkogrim",
    name: "Kyrkogrim",
    assetId: "enemy.kyrkogrim",
    hp: 180,
    speed: 0.9,
    bounty: 16,
    scale: 1,
    boss: false,
    slowResist: 0.7,
  },
  {
    // Water horse — already of the water, sunlight glances off entirely
    // (slowResist 1, never förstenad). Fast AND sturdy: a priority target.
    id: "backahast",
    name: "Bäckahästen",
    assetId: "enemy.backahast",
    hp: 90,
    speed: 1.9,
    bounty: 12,
    scale: 1.2,
    boss: false,
    slowResist: 1,
  },
  {
    // Walking boulder. Cracks open on death into two trollyngel that keep
    // running from where it fell — budget overkill or a catcher behind it.
    id: "stentroll",
    name: "Stentroll",
    assetId: "enemy.stentroll",
    hp: 220,
    speed: 0.6,
    bounty: 10,
    scale: 1,
    boss: false,
    slowResist: 0,
    splitsInto: { enemyTypeId: "trollyngel", count: 2 },
  },
  {
    // The stentroll's spawn — tiny, quick, almost free. Only ever enters
    // via splitsInto, never in wave lists of its own.
    id: "trollyngel",
    name: "Trollyngel",
    assetId: "enemy.trollyngel",
    hp: 25,
    speed: 1.8,
    bounty: 3,
    scale: 0.7,
    boss: false,
    slowResist: 0,
  },
  {
    // Rare treasure-carrier: fastest thing in the woods, bounty 40 (>5x its
    // hp-peers) — kill it before it escapes! Sprinkled rarely from level05.
    id: "skattvatte",
    name: "Skattvätte",
    assetId: "enemy.skattvatte",
    hp: 60,
    speed: 2.4,
    bounty: 40,
    scale: 1,
    boss: false,
    slowResist: 0,
  },
  // ── Bosses ── one per level, closing the final wave. Drawn bigger
  // (scale) and given the boss UI treatment (hp banner, spawn fanfare).
  {
    id: "vattekungen",
    name: "Vättekungen",
    assetId: "enemy.vattekungen",
    hp: 700,
    speed: 0.55,
    bounty: 60,
    scale: 1.5,
    boss: true,
    slowResist: 0,
  },
  {
    id: "trollmodern",
    name: "Trollmodern",
    assetId: "enemy.trollmodern",
    hp: 1600,
    speed: 0.5,
    bounty: 120,
    scale: 1.8,
    boss: true,
    slowResist: 0,
  },
  {
    id: "sjoraet",
    name: "Sjörået",
    assetId: "enemy.sjoraet",
    hp: 2600,
    speed: 0.55,
    bounty: 180,
    scale: 1.8,
    boss: true,
    slowResist: 0,
  },
  {
    // Level06 (Gruvgången). King under the mountain — stone-stubborn
    // against petrify (slowResist 0.8); the narrow corridor must hit hard.
    id: "gruvkungen",
    name: "Gruvkungen",
    assetId: "enemy.gruvkungen",
    hp: 3800,
    speed: 0.5,
    bounty: 250,
    scale: 1.9,
    boss: true,
    slowResist: 0.8,
  },
  {
    // Level08 (Vinternatten). The winter-night prince — when he shatters,
    // four mylingar rise from the snow where he fell (splitsInto).
    id: "isfursten",
    name: "Isfursten",
    assetId: "enemy.isfursten",
    hp: 5200,
    speed: 0.45,
    bounty: 350,
    scale: 1.9,
    boss: true,
    slowResist: 0,
    splitsInto: { enemyTypeId: "myling", count: 4 },
  },
  {
    // Level09 (Urskogen) — the final boss. The forest's own longing walks
    // out of the trees; half the sunlight slides off her (slowResist 0.5).
    id: "skogsraet",
    name: "Skogsrået",
    assetId: "enemy.skogsraet",
    hp: 7500,
    speed: 0.5,
    bounty: 500,
    scale: 2,
    boss: true,
    slowResist: 0.5,
  },
];
