import type { MetaUpgradeDef } from "./schema";

/**
 * Economy rebalance (2026-06): one won map used to pay for nearly the whole
 * shop. Costs are TROLLSILVER (earned at globals.silverPerScore = 0.25 per
 * score point — one Gläntan win ≈ 280 silver → 2 rank-1 upgrades OR saves
 * toward Näcken at 250). Costs escalate per rank:
 * rank r costs round(cost × costGrowth^(r−1)).
 *
 * Max-out cost per upgrade:
 *   bjornstyrka 100 × 1.7^r, 5 ranks: 100+170+289+491+835  = 1885
 *   ugglesyn    120 × 1.7^r, 4 ranks: 120+204+347+590      = 1261
 *   skattkista   80 × 1.6^r, 5 ranks:  80+128+205+328+524  = 1265
 *   stugvarme   140 × 1.8^r, 4 ranks: 140+252+454+816      = 1662
 *   ─────────────────────────────────────────────────────────────
 *   TOTAL MAX-OUT: 6073 trollsilver (≈ 20+ won maps at ~280 silver/win —
 *   deliberately a long-haul sink; the content.spec.ts economy test
 *   asserts this exact figure).
 */
export const metaUpgrades: MetaUpgradeDef[] = [
  {
    id: "bjornstyrka",
    name: "Björnstyrka",
    description: "Med björnens kraft i timret slår varje torn 10 % hårdare.",
    assetId: "upgrade.bjornstyrka",
    cost: 100,
    costGrowth: 1.7,
    maxRank: 5,
    effect: { kind: "damageMult", value: 0.1 },
  },
  {
    id: "ugglesyn",
    name: "Ugglesyn",
    description: "Varje torn ser 10 % längre, för ugglan i granen missar ingenting.",
    assetId: "upgrade.ugglesyn",
    cost: 120,
    costGrowth: 1.7,
    maxRank: 4,
    effect: { kind: "rangeMult", value: 0.1 },
  },
  {
    id: "skattkista",
    name: "Skattkista",
    description: "Gammalt trollsilver, nyputsat: börja varje försvar med +40 guld.",
    assetId: "upgrade.skattkista",
    cost: 80,
    costGrowth: 1.6,
    maxRank: 5,
    effect: { kind: "startGold", value: 40 },
  },
  {
    id: "stugvarme",
    name: "Stugvärme",
    description: "Brasan brinner och modet håller, så varje försvar börjar med +2 liv.",
    assetId: "upgrade.stugvarme",
    cost: 140,
    costGrowth: 1.8,
    maxRank: 4,
    effect: { kind: "startLives", value: 2 },
  },
];
