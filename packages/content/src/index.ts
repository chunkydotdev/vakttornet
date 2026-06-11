import { ASSET_IDS } from "@vakttornet/assets";
import { contentBundleSchema, type ContentBundle } from "./schema";
import { enemies } from "./enemies";
import { towers } from "./towers";
import { level01 } from "./levels/level01";
import { level02 } from "./levels/level02";
import { metaUpgrades } from "./metaUpgrades";
import { globals } from "./globals";

export * from "./schema";
export { enemies } from "./enemies";
export { towers } from "./towers";
export { level01 } from "./levels/level01";
export { level02 } from "./levels/level02";
export { metaUpgrades } from "./metaUpgrades";
export { globals } from "./globals";

export const levels = [level01, level02];

/**
 * Cross-reference checks beyond what zod schemas can express.
 * Returns one human-readable message per violation (empty = healthy).
 */
export function collectIntegrityViolations(bundle: ContentBundle): string[] {
  const violations: string[] = [];
  const validAssetIds = new Set<string>(ASSET_IDS);

  for (const enemy of bundle.enemies) {
    if (!validAssetIds.has(enemy.assetId)) {
      violations.push(
        `enemy "${enemy.id}": assetId "${enemy.assetId}" is not in ASSET_IDS`,
      );
    }
  }
  for (const tower of bundle.towers) {
    if (!validAssetIds.has(tower.assetId)) {
      violations.push(
        `tower "${tower.id}": assetId "${tower.assetId}" is not in ASSET_IDS`,
      );
    }
  }

  const enemyIds = new Set(bundle.enemies.map((e) => e.id));
  for (const level of bundle.levels) {
    level.waves.forEach((wave, waveIdx) => {
      wave.entries.forEach((entry, entryIdx) => {
        if (!enemyIds.has(entry.enemyTypeId)) {
          violations.push(
            `level "${level.id}" wave ${waveIdx + 1} entry ${entryIdx + 1}: ` +
              `enemyTypeId "${entry.enemyTypeId}" does not match any enemy def`,
          );
        }
      });
    });
  }

  const collections: Array<[string, Array<{ id: string }>]> = [
    ["enemy", bundle.enemies],
    ["tower", bundle.towers],
    ["level", bundle.levels],
    ["metaUpgrade", bundle.metaUpgrades],
  ];
  for (const [kind, defs] of collections) {
    const seen = new Set<string>();
    for (const def of defs) {
      if (seen.has(def.id)) {
        violations.push(`${kind} id "${def.id}" is defined more than once`);
      }
      seen.add(def.id);
    }
  }

  return violations;
}

/** Throws with a message listing every violation found in the bundle. */
export function assertContentIntegrity(bundle: ContentBundle): void {
  const violations = collectIntegrityViolations(bundle);
  if (violations.length > 0) {
    throw new Error(
      `Content integrity check failed (${violations.length} violation${violations.length === 1 ? "" : "s"}):\n` +
        violations.map((v) => `  - ${v}`).join("\n"),
    );
  }
}

/** Assemble, schema-validate, and cross-check the full content bundle. */
export function buildContent(): ContentBundle {
  const bundle = contentBundleSchema.parse({
    enemies,
    towers,
    levels,
    metaUpgrades,
    globals,
  });
  assertContentIntegrity(bundle);
  return bundle;
}
