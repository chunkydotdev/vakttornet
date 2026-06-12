import type { Globals } from "./schema";

/**
 * Economy sanity (2026-06 rebalance): a good Gläntan win scores ~1100-1200
 * poäng → ≈ 280 trollsilver at 0.25/poäng. That buys 2 rank-1 meta upgrades
 * (80-140 each) OR saves most of the way toward Näcken (250 in FÖRRÅDET).
 */
export const globals: Globals = {
  silverPerScore: 0.25,
  sellRefundRatio: 0.7,
  waveClearBonusPerWave: 10,
  winBonusPerLife: 20,
};
