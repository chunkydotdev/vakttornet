import { describe, expect, it } from "vitest";
import {
  assertContentIntegrity,
  buildContent,
  collectIntegrityViolations,
  contentBundleSchema,
  type ContentBundle,
  type LevelDef,
} from "../src";

describe("buildContent", () => {
  it("returns a bundle that passes the zod schema", () => {
    const bundle = buildContent();
    expect(() => contentBundleSchema.parse(bundle)).not.toThrow();
  });

  it("contains the expected defs", () => {
    const bundle = buildContent();
    expect(bundle.enemies.map((e) => e.id).sort()).toEqual([
      "brute",
      "runner",
      "swarm",
    ]);
    expect(bundle.towers.map((t) => t.id).sort()).toEqual([
      "arrow",
      "cannon",
      "crossbow",
    ]);
    expect(bundle.levels.map((l) => l.id)).toEqual(["level01", "level02"]);
    expect(bundle.metaUpgrades).toHaveLength(4);
  });

  it("level01 is unlocked from the start, level02 is not", () => {
    const bundle = buildContent();
    expect(bundle.levels[0]!.unlockPoints).toBe(0);
    expect(bundle.levels[1]!.unlockPoints).toBeGreaterThan(0);
  });
});

describe("integrity cross-checks", () => {
  it("a healthy bundle has zero violations", () => {
    expect(collectIntegrityViolations(buildContent())).toEqual([]);
  });

  it("flags unknown assetIds, unknown enemyTypeIds, and duplicate ids", () => {
    const broken: ContentBundle = structuredClone(buildContent());
    broken.enemies[0]!.assetId = "enemy.does-not-exist";
    broken.towers[0]!.assetId = "tower.bogus";
    broken.levels[0]!.waves[0]!.entries[0]!.enemyTypeId = "ghost";
    broken.towers.push(structuredClone(broken.towers[1]!)); // duplicate tower id
    broken.metaUpgrades.push(structuredClone(broken.metaUpgrades[0]!)); // duplicate upgrade id

    const violations = collectIntegrityViolations(broken);
    expect(violations).toHaveLength(5);
    expect(violations.join("\n")).toContain("enemy.does-not-exist");
    expect(violations.join("\n")).toContain("tower.bogus");
    expect(violations.join("\n")).toContain('"ghost"');
    expect(violations.join("\n")).toContain("defined more than once");

    expect(() => assertContentIntegrity(broken)).toThrowError(
      /Content integrity check failed \(5 violations\)/,
    );
    expect(() => assertContentIntegrity(broken)).toThrowError(/ghost/);
  });

  it("assertContentIntegrity passes a healthy bundle through silently", () => {
    expect(() => assertContentIntegrity(buildContent())).not.toThrow();
  });
});

describe("level maps", () => {
  /**
   * BFS from S over path tiles (P) to E, 4-directional. Returns the set of
   * visited path-ish tiles so we can also detect orphaned P tiles.
   */
  function bfsFromSpawn(map: string[]): {
    reachedExit: boolean;
    visitedPathTiles: number;
  } {
    const rows = map.length;
    const cols = map[0]!.length;
    const at = (col: number, row: number): string | undefined =>
      map[row]?.[col];

    let start: [number, number] | undefined;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (at(c, r) === "S") start = [c, r];
      }
    }
    expect(start).toBeDefined();

    const visited = new Set<string>();
    const queue: Array<[number, number]> = [start!];
    visited.add(`${start![0]},${start![1]}`);
    let reachedExit = false;
    let visitedPathTiles = 0;

    while (queue.length > 0) {
      const [c, r] = queue.shift()!;
      const ch = at(c, r);
      if (ch === "E") {
        reachedExit = true;
        continue; // the exit ends the path
      }
      if (ch === "P") visitedPathTiles++;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nc = c + dc;
        const nr = r + dr;
        const nch = at(nc, nr);
        const key = `${nc},${nr}`;
        if ((nch === "P" || nch === "E") && !visited.has(key)) {
          visited.add(key);
          queue.push([nc, nr]);
        }
      }
    }
    return { reachedExit, visitedPathTiles };
  }

  function countChar(map: string[], ch: string): number {
    return map.join("").split("").filter((c) => c === ch).length;
  }

  function checkLevel(level: LevelDef): void {
    // equal-length rows (also enforced by zod, but cheap to re-assert)
    for (const row of level.map) {
      expect(row.length).toBe(level.map[0]!.length);
    }
    expect(countChar(level.map, "S")).toBe(1);
    expect(countChar(level.map, "E")).toBe(1);

    const { reachedExit, visitedPathTiles } = bfsFromSpawn(level.map);
    expect(reachedExit, `${level.id}: E must be reachable from S via P`).toBe(
      true,
    );
    expect(
      visitedPathTiles,
      `${level.id}: every P tile must be connected to the S→E path`,
    ).toBe(countChar(level.map, "P"));
  }

  it("level01 has a contiguous S→P…→E path", () => {
    checkLevel(buildContent().levels[0]!);
  });

  it("level02 has a contiguous S→P…→E path", () => {
    checkLevel(buildContent().levels[1]!);
  });
});

describe("tower defs", () => {
  it("level costs are non-decreasing within each tower", () => {
    for (const tower of buildContent().towers) {
      for (let i = 1; i < tower.levels.length; i++) {
        expect(
          tower.levels[i]!.cost,
          `${tower.id}: cost of level ${i + 1} must be >= level ${i}`,
        ).toBeGreaterThanOrEqual(tower.levels[i - 1]!.cost);
      }
    }
  });

  it("damage rises with each level", () => {
    for (const tower of buildContent().towers) {
      for (let i = 1; i < tower.levels.length; i++) {
        expect(tower.levels[i]!.damage).toBeGreaterThan(
          tower.levels[i - 1]!.damage,
        );
      }
    }
  });
});
