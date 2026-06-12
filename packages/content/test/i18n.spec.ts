import { describe, expect, it } from "vitest";
import { buildContent, en, type ContentTranslation } from "../src";

/**
 * Translation parity: the en overlay must cover EVERY id in the bundle
 * (no missing translations) and must not carry keys that match nothing
 * (no orphans). Both directions, all five categories, mutations included.
 */
const bundle = buildContent();

function expectExactIdParity(
  label: string,
  bundleIds: string[],
  translationKeys: string[],
): void {
  const idSet = new Set(bundleIds);
  const keySet = new Set(translationKeys);
  for (const id of bundleIds) {
    expect(keySet.has(id), `${label}: bundle id "${id}" has no en translation`).toBe(
      true,
    );
  }
  for (const key of translationKeys) {
    expect(idSet.has(key), `${label}: en key "${key}" matches no bundle id`).toBe(
      true,
    );
  }
}

describe("en translation overlay", () => {
  it("satisfies the ContentTranslation contract", () => {
    const typed: ContentTranslation = en;
    expect(typed).toBe(en);
  });

  it("towers: every tower id is translated, no orphan keys", () => {
    expectExactIdParity(
      "towers",
      bundle.towers.map((t) => t.id),
      Object.keys(en.towers),
    );
  });

  it("tower mutations: full two-way parity per tower", () => {
    for (const tower of bundle.towers) {
      const entry = en.towers[tower.id];
      expect(entry, `tower "${tower.id}" missing from en`).toBeDefined();
      expectExactIdParity(
        `tower "${tower.id}" mutations`,
        (tower.mutations ?? []).map((m) => m.id),
        Object.keys(entry!.mutations),
      );
    }
  });

  it("enemies: every enemy id is translated, no orphan keys", () => {
    expectExactIdParity(
      "enemies",
      bundle.enemies.map((e) => e.id),
      Object.keys(en.enemies),
    );
  });

  it("levels: every level id is translated, no orphan keys", () => {
    expectExactIdParity(
      "levels",
      bundle.levels.map((l) => l.id),
      Object.keys(en.levels),
    );
  });

  it("metaUpgrades: every upgrade id is translated, no orphan keys", () => {
    expectExactIdParity(
      "metaUpgrades",
      bundle.metaUpgrades.map((u) => u.id),
      Object.keys(en.metaUpgrades),
    );
  });

  it("sagner: every sägen id is translated, no orphan keys", () => {
    expectExactIdParity(
      "sagner",
      bundle.sagner.map((s) => s.id),
      Object.keys(en.sagner),
    );
  });

  it("every translated string is non-empty", () => {
    for (const [towerId, tower] of Object.entries(en.towers)) {
      expect(tower.name.trim().length, `tower "${towerId}" name`).toBeGreaterThan(0);
      expect(
        tower.description.trim().length,
        `tower "${towerId}" description`,
      ).toBeGreaterThan(0);
      for (const [mutationId, mutation] of Object.entries(tower.mutations)) {
        expect(
          mutation.name.trim().length,
          `mutation "${mutationId}" name`,
        ).toBeGreaterThan(0);
        expect(
          mutation.description.trim().length,
          `mutation "${mutationId}" description`,
        ).toBeGreaterThan(0);
      }
    }
    for (const [enemyId, enemy] of Object.entries(en.enemies)) {
      expect(enemy.name.trim().length, `enemy "${enemyId}" name`).toBeGreaterThan(0);
    }
    for (const [levelId, level] of Object.entries(en.levels)) {
      expect(level.name.trim().length, `level "${levelId}" name`).toBeGreaterThan(0);
    }
    for (const [upgradeId, upgrade] of Object.entries(en.metaUpgrades)) {
      expect(
        upgrade.name.trim().length,
        `metaUpgrade "${upgradeId}" name`,
      ).toBeGreaterThan(0);
      expect(
        upgrade.description.trim().length,
        `metaUpgrade "${upgradeId}" description`,
      ).toBeGreaterThan(0);
    }
    for (const [sagenId, sagen] of Object.entries(en.sagner)) {
      expect(sagen.title.trim().length, `sägen "${sagenId}" title`).toBeGreaterThan(0);
      expect(sagen.text.trim().length, `sägen "${sagenId}" text`).toBeGreaterThan(0);
    }
  });

  it("keeps the em-dash discipline of the Swedish source (at most 4 in the whole overlay)", () => {
    const everything = JSON.stringify(en);
    const emDashes = (everything.match(/—/g) ?? []).length;
    expect(emDashes).toBeLessThanOrEqual(4);
  });
});
