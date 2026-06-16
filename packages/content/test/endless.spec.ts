import { describe, expect, it } from "vitest";
import {
  ENDLESS_CONFIG,
  enemies,
  enemyDefSchema,
  generateEndless,
  levelDefSchema,
} from "../src";

describe("generateEndless", () => {
  const { level, enemies: generated } = generateEndless(enemies);
  const byId = new Map(generated.map((e) => [e.id, e]));

  it("produces a schema-valid level with the configured wave count", () => {
    expect(() => levelDefSchema.parse(level)).not.toThrow();
    expect(level.waves.length).toBe(ENDLESS_CONFIG.totalWaves);
    expect(level.startLives).toBe(ENDLESS_CONFIG.startLives);
    expect(level.startGold).toBe(ENDLESS_CONFIG.startGold);
  });

  it("produces schema-valid, self-contained scaled enemies", () => {
    for (const e of generated) {
      expect(() => enemyDefSchema.parse(e)).not.toThrow();
      expect(e.splitsInto).toBeUndefined(); // stripped so the bundle needs nothing else
    }
  });

  it("references only generated enemies in every wave (no dangling ids)", () => {
    for (const wave of level.waves) {
      for (const entry of wave.entries) {
        expect(byId.has(entry.enemyTypeId)).toBe(true);
      }
    }
  });

  it("scales fodder HP geometrically while bounty lags — defences must fall behind", () => {
    const base = enemies.find((e) => e.id === "myling")!;
    const w2 = byId.get("e-myling-w2")!;
    const w12 = byId.get("e-myling-w12")!;
    expect(w2.hp).toBe(Math.round(base.hp * ENDLESS_CONFIG.hpGrowth ** 1));
    expect(w12.hp).toBeGreaterThan(w2.hp);
    // The whole challenge: gold-per-HP shrinks every wave, so you can never keep up.
    expect(w12.bounty / w12.hp).toBeLessThan(w2.bounty / w2.hp);
  });

  it("fields bosses on the configured cadence (double on big-boss waves)", () => {
    const firstBoss = level.waves[ENDLESS_CONFIG.bossEvery - 1]!; // wave 5
    expect(firstBoss.entries.some((e) => e.enemyTypeId.startsWith("e-vattekungen-"))).toBe(true);

    const bigBoss = level.waves[ENDLESS_CONFIG.bigBossEvery - 1]!; // wave 15
    const bossEntry = bigBoss.entries.find((e) => /^e-(sjoraet|trollmodern|gruvkungen|isfursten|skogsraet|vattekungen)-/.test(e.enemyTypeId));
    expect(bossEntry?.count).toBe(2);
  });

  it("is deterministic — the gauntlet is identical for every player", () => {
    expect(generateEndless(enemies)).toEqual(generateEndless(enemies));
  });
});
