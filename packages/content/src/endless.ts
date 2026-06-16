/**
 * Endless ("Evig vakt") — a single, fixed, ever-escalating gauntlet everyone
 * faces identically (a fair survival ladder). The waves are GENERATED, not
 * hand-authored: enemy HP climbs geometrically while bounty climbs slower, so
 * every defence eventually falls behind no matter how well it is built. The
 * only question is how many waves you last.
 *
 * Determinism: pure math, no RNG — the gauntlet is byte-identical for every
 * player, which is what makes the leaderboard comparable. Tuning knobs live in
 * ENDLESS_CONFIG (balance numbers belong in content); generateEndless turns
 * them into schema-valid scaled enemies + a LevelDef the normal sim consumes
 * unchanged. The app calls it with the LOCALISED enemy defs so generated
 * variants inherit the right-language names; the content test calls it with
 * the canonical defs.
 */
import type { EnemyDef, LevelDef, WaveDef, WaveEntry } from "./schema";

/** 15×11 single-corridor serpentine: long path, generous build flanks. One S,
 * one E; width-1 with single-tile connectors so the BFS path is unambiguous. */
const ENDLESS_MAP = [
  "...............",
  "...............",
  "SPPPPPPPPPPPPP.",
  ".............P.",
  ".PPPPPPPPPPPPP.",
  ".P.............",
  ".PPPPPPPPPPPPP.",
  ".............P.",
  ".EPPPPPPPPPPPP.",
  "...............",
  "...............",
];

export const ENDLESS_CONFIG = {
  levelId: "endless",
  /** canonical (sv) name; the app shows a localised title in the HUD instead */
  name: "Den eviga natten",
  startGold: 260,
  startLives: 20,
  /** effectively forever: by this wave HP is astronomically unsurvivable */
  totalWaves: 160,
  /** fodder HP ×growth per wave — the wall. Bounty grows slower → you fall behind. */
  hpGrowth: 1.12,
  bountyGrowth: 1.05,
  /** bosses grow gentler so a leaked-boss instant-loss isn't a premature hard wall;
   * fodder attrition stays the primary pressure */
  bossHpGrowth: 1.06,
  baseCount: 8,
  countPerWave: 0.7,
  fodderSpacingTicks: 16,
  bossEvery: 5,
  /** every Nth boss wave fields two bosses */
  bigBossEvery: 15,
  map: ENDLESS_MAP,
  /** base enemy ids drawn for regular waves (mix of swarm / standard / fast / tank) */
  fodder: ["vatte", "myling", "skuggvarg", "troll", "backahast"],
  /** base boss ids, cycled across boss waves */
  bosses: ["vattekungen", "trollmodern", "sjoraet", "gruvkungen", "isfursten", "skogsraet"],
} as const;

const cfg = ENDLESS_CONFIG;

/**
 * Generate the endless level + the scaled enemy defs its waves reference.
 * `baseEnemies` supplies the source stats/art/names (canonical or localised).
 * Returned enemies are self-contained (splitsInto stripped) so the bundle
 * needs nothing else.
 */
export function generateEndless(baseEnemies: readonly EnemyDef[]): {
  level: LevelDef;
  enemies: EnemyDef[];
} {
  const byId = new Map(baseEnemies.map((e) => [e.id, e]));
  const scaled: EnemyDef[] = [];
  const seen = new Set<string>();

  function variant(baseId: string, wave: number, hpGrowth: number): string {
    const base = byId.get(baseId);
    if (!base) throw new Error(`endless: unknown base enemy "${baseId}"`);
    const id = `e-${baseId}-w${wave}`;
    if (!seen.has(id)) {
      seen.add(id);
      scaled.push({
        ...base,
        id,
        hp: Math.round(base.hp * Math.pow(hpGrowth, wave - 1)),
        bounty: Math.round(base.bounty * Math.pow(cfg.bountyGrowth, wave - 1)),
        splitsInto: undefined,
      });
    }
    return id;
  }

  const waves: WaveDef[] = [];
  for (let w = 1; w <= cfg.totalWaves; w++) {
    const entries: WaveEntry[] = [];
    const count = Math.round(cfg.baseCount + (w - 1) * cfg.countPerWave);

    // Main fodder column.
    const main = cfg.fodder[(w - 1) % cfg.fodder.length]!;
    entries.push({
      enemyTypeId: variant(main, w, cfg.hpGrowth),
      count,
      spacingTicks: cfg.fodderSpacingTicks,
      delayTicks: 0,
    });

    // Mixed pressure: a second type joins on even waves.
    if (w % 2 === 0) {
      const second = cfg.fodder[(w * 2) % cfg.fodder.length]!;
      entries.push({
        enemyTypeId: variant(second, w, cfg.hpGrowth),
        count: Math.max(4, Math.round(count * 0.5)),
        spacingTicks: Math.max(8, cfg.fodderSpacingTicks - 4),
        delayTicks: 40,
      });
    }

    // Boss cadence — leaking one ends the run outright (global rule).
    if (w % cfg.bossEvery === 0) {
      const big = w % cfg.bigBossEvery === 0;
      const bossId = cfg.bosses[(Math.floor(w / cfg.bossEvery) - 1) % cfg.bosses.length]!;
      entries.push({
        enemyTypeId: variant(bossId, w, cfg.bossHpGrowth),
        count: big ? 2 : 1,
        spacingTicks: 50,
        delayTicks: 60,
      });
    }

    waves.push({ entries });
  }

  const level: LevelDef = {
    id: cfg.levelId,
    name: cfg.name,
    map: [...cfg.map],
    waves,
    startGold: cfg.startGold,
    startLives: cfg.startLives,
    unlockPoints: 0,
  };

  return { level, enemies: scaled };
}
