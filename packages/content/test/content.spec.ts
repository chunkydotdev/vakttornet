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
      "backahast",
      "gruvkungen",
      "isfursten",
      "kyrkogrim",
      "myling",
      "sjoraet",
      "skattvatte",
      "skogsraet",
      "skuggvarg",
      "stentroll",
      "troll",
      "trollmodern",
      "trollyngel",
      "vatte",
      "vattekungen",
    ]);
    expect(bundle.towers.map((t) => t.id).sort()).toEqual([
      "nacken",
      "runsten",
      "sollykta",
      "tomte",
      "vardtradet",
    ]);
    expect(bundle.levels.map((l) => l.id)).toEqual([
      "level01",
      "level02",
      "level03",
      "level04",
      "level05",
      "level06",
      "level07",
      "level08",
      "level09",
    ]);
    expect(bundle.metaUpgrades).toHaveLength(4);
    expect(bundle.sagner).toHaveLength(14);
  });

  it("level01 is unlocked from the start, level02 is not", () => {
    const bundle = buildContent();
    expect(bundle.levels[0]!.unlockPoints).toBe(0);
    expect(bundle.levels[1]!.unlockPoints).toBeGreaterThan(0);
  });

  it("ships nine levels on the exact unlock ladder, strictly increasing", () => {
    const levelPoints = buildContent().levels.map((l) => l.unlockPoints);
    expect(levelPoints).toEqual([
      0, 400, 1000, 1800, 2800, 4200, 6000, 8200, 11000,
    ]);
    // strictly increasing — guards against reorders and copy-paste unlocks
    for (let i = 1; i < levelPoints.length; i++) {
      expect(levelPoints[i]!).toBeGreaterThan(levelPoints[i - 1]!);
    }
  });

  it("wave counts rise across the campaign: 7,8,9,10,10,11,12,13,14", () => {
    const counts = buildContent().levels.map((l) => l.waves.length);
    expect(counts).toEqual([7, 8, 9, 10, 10, 11, 12, 13, 14]);
  });

  it("the unlock ladder is sensible: free starters, then nacken 300, vardtradet 800, level03 1000", () => {
    const bundle = buildContent();
    const tower = (id: string) => bundle.towers.find((t) => t.id === id)!;
    expect(tower("tomte").unlockPoints).toBe(0);
    expect(tower("runsten").unlockPoints).toBe(0);
    expect(tower("sollykta").unlockPoints).toBe(0);
    expect(tower("nacken").unlockPoints).toBe(300);
    expect(tower("vardtradet").unlockPoints).toBe(800);

    const levelPoints = bundle.levels.map((l) => l.unlockPoints);
    expect(levelPoints[2]).toBe(1000);
    // the level02 grind unlocks nacken before level03 opens
    expect(tower("nacken").unlockPoints).toBeLessThan(levelPoints[2]!);
    expect(tower("vardtradet").unlockPoints).toBeLessThan(levelPoints[2]!);
  });

  it("every map starts within the agreed band: 120-170 gold, 8-10 lives (new maps 130-170)", () => {
    for (const level of buildContent().levels) {
      const minGold = level.unlockPoints >= 1800 ? 130 : 120;
      expect(level.startGold).toBeGreaterThanOrEqual(minGold);
      expect(level.startGold).toBeLessThanOrEqual(170);
      expect(level.startLives).toBeGreaterThanOrEqual(8);
      expect(level.startLives).toBeLessThanOrEqual(10);
    }
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

  it("splitsInto references valid enemy ids in the healthy bundle", () => {
    const bundle = buildContent();
    const enemyIds = new Set(bundle.enemies.map((e) => e.id));
    for (const enemy of bundle.enemies) {
      if (!enemy.splitsInto) continue;
      expect(
        enemyIds.has(enemy.splitsInto.enemyTypeId),
        `enemy "${enemy.id}" splits into unknown "${enemy.splitsInto.enemyTypeId}"`,
      ).toBe(true);
    }
    // the two splitters we actually ship
    const byId = (id: string) => bundle.enemies.find((e) => e.id === id)!;
    expect(byId("stentroll").splitsInto).toEqual({
      enemyTypeId: "trollyngel",
      count: 2,
    });
    expect(byId("isfursten").splitsInto).toEqual({
      enemyTypeId: "myling",
      count: 4,
    });
  });

  it("flags splitsInto references to unknown enemy ids", () => {
    const broken: ContentBundle = structuredClone(buildContent());
    const stentroll = broken.enemies.find((e) => e.id === "stentroll")!;
    stentroll.splitsInto = { enemyTypeId: "grottyngel", count: 2 };

    const violations = collectIntegrityViolations(broken);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('"grottyngel"');
    expect(violations[0]).toContain("stentroll");
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
      // the walked route may only ever touch spawn/path/exit tiles — never
      // water (~), boulders (#), or open ground (.)
      expect(["S", "P", "E"]).toContain(ch);
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

  it("EVERY level has a contiguous S→P…→E path that never touches water", () => {
    const bundle = buildContent();
    expect(bundle.levels).toHaveLength(9);
    for (const level of bundle.levels) {
      checkLevel(level);
    }
  });

  it("the water-identity maps actually carry water", () => {
    const bundle = buildContent();
    const byId = (id: string) => bundle.levels.find((l) => l.id === id)!;
    // level03: the tarn fills the center
    expect(countChar(byId("level03").map, "~")).toBeGreaterThanOrEqual(20);
    // level05: a brook trickles through the ravine
    expect(countChar(byId("level05").map, "~")).toBeGreaterThanOrEqual(6);
    // level07: the delta is more water than land
    expect(countChar(byId("level07").map, "~")).toBeGreaterThanOrEqual(40);
  });

  it("boards stay within the 16×11 cap", () => {
    for (const level of buildContent().levels) {
      expect(level.map[0]!.length).toBeLessThanOrEqual(16);
      expect(level.map.length).toBeLessThanOrEqual(11);
    }
  });
});

describe("boss waves", () => {
  const expectedBossByLevel: Record<string, string> = {
    level01: "vattekungen",
    level02: "trollmodern",
    level03: "sjoraet",
    level04: "vattekungen", // returns with a far stronger escort
    level05: "trollmodern",
    level06: "gruvkungen",
    level07: "sjoraet", // home turf — heavy escort
    level08: "isfursten",
    level09: "skogsraet", // the final boss
  };

  it("each boss def is flagged boss:true and drawn larger than a tile", () => {
    const bundle = buildContent();
    for (const bossId of new Set(Object.values(expectedBossByLevel))) {
      const def = bundle.enemies.find((e) => e.id === bossId);
      expect(def, `boss def "${bossId}" must exist`).toBeDefined();
      expect(def!.boss).toBe(true);
      expect(def!.scale).toBeGreaterThan(1);
    }
    // the new bosses fill the 1.8-2.0 band — rendered up to 2x a tile
    for (const bossId of ["gruvkungen", "isfursten", "skogsraet"]) {
      const def = bundle.enemies.find((e) => e.id === bossId)!;
      expect(def.scale).toBeGreaterThanOrEqual(1.8);
      expect(def.scale).toBeLessThanOrEqual(2);
    }
  });

  it("the rank-and-file enemies are not bosses", () => {
    const bundle = buildContent();
    const bossIds = new Set(Object.values(expectedBossByLevel));
    for (const def of bundle.enemies) {
      if (bossIds.has(def.id)) continue;
      expect(def.boss, `${def.id} must not be a boss`).toBe(false);
    }
    // the founding three stay tile-sized; the new silhouettes diverge on purpose
    for (const id of ["myling", "vatte", "troll", "skuggvarg", "kyrkogrim"]) {
      expect(bundle.enemies.find((e) => e.id === id)!.scale).toBe(1);
    }
    expect(bundle.enemies.find((e) => e.id === "backahast")!.scale).toBe(1.2);
    expect(bundle.enemies.find((e) => e.id === "trollyngel")!.scale).toBe(0.7);
  });

  it("petrify resistance sits on the intended väsen only", () => {
    const bundle = buildContent();
    const resist = new Map(bundle.enemies.map((e) => [e.id, e.slowResist]));
    expect(resist.get("kyrkogrim")).toBe(0.7);
    expect(resist.get("backahast")).toBe(1); // immune — already of the water
    expect(resist.get("gruvkungen")).toBe(0.8);
    expect(resist.get("skogsraet")).toBe(0.5);
    for (const id of ["myling", "vatte", "troll", "skuggvarg", "stentroll", "trollyngel", "skattvatte", "vattekungen", "trollmodern", "sjoraet", "isfursten"]) {
      expect(resist.get(id), `${id} should petrify normally`).toBe(0);
    }
  });

  it("every level's FINAL wave has exactly one boss entry (count 1), earlier waves none", () => {
    const bundle = buildContent();
    const bossIds = new Set(
      bundle.enemies.filter((e) => e.boss).map((e) => e.id),
    );
    for (const level of bundle.levels) {
      level.waves.forEach((wave, waveIdx) => {
        const bossEntries = wave.entries.filter((e) =>
          bossIds.has(e.enemyTypeId),
        );
        if (waveIdx === level.waves.length - 1) {
          expect(
            bossEntries,
            `${level.id} final wave must have exactly one boss entry`,
          ).toHaveLength(1);
          expect(bossEntries[0]!.count).toBe(1);
          expect(bossEntries[0]!.enemyTypeId).toBe(
            expectedBossByLevel[level.id],
          );
          // the boss closes the wave after a dramatic pause
          expect(wave.entries[wave.entries.length - 1]).toBe(bossEntries[0]);
          expect(bossEntries[0]!.delayTicks).toBeGreaterThanOrEqual(60);
        } else {
          expect(
            bossEntries,
            `${level.id} wave ${waveIdx + 1} must not contain a boss`,
          ).toHaveLength(0);
        }
      });
    }
  });

  it("each boss has a first-kill sägen referencing its real enemy id", () => {
    const bundle = buildContent();
    const conditions = bundle.sagner.map((s) => s.condition);
    for (const bossId of new Set(Object.values(expectedBossByLevel))) {
      expect(conditions).toContainEqual({
        kind: "kills",
        enemyTypeId: bossId,
        count: 1,
      });
    }
    const titles = bundle.sagner.map((s) => s.title);
    expect(titles).toContain("Vättekungens fall");
    expect(titles).toContain("Trollmoderns sista vagga");
    expect(titles).toContain("Sjörået stiger");
    expect(titles).toContain("Gruvkungens sista ådra");
    expect(titles).toContain("Isfurstens töväder");
    expect(titles).toContain("Skogsrået vänder sig om");
  });

  it("the bundle with bosses still passes the full integrity check", () => {
    expect(collectIntegrityViolations(buildContent())).toEqual([]);
  });
});

describe("skattvatte — the treasure-carrier gimmick", () => {
  it("bounty 40 on a 60 hp sprinter: the fastest, richest regular in the woods", () => {
    const bundle = buildContent();
    const skattvatte = bundle.enemies.find((e) => e.id === "skattvatte")!;
    expect(skattvatte.bounty).toBe(40);
    expect(skattvatte.boss).toBe(false);
    // fastest regular on the board — it is trying to escape
    for (const def of bundle.enemies) {
      if (def.id === "skattvatte") continue;
      expect(def.speed).toBeLessThan(skattvatte.speed);
    }
  });

  it("out-bounties every wave-peer by more than 3x, in every appearance", () => {
    const bundle = buildContent();
    const byId = new Map(bundle.enemies.map((e) => [e.id, e]));
    const skattvatte = byId.get("skattvatte")!;
    let appearances = 0;
    for (const level of bundle.levels) {
      for (const wave of level.waves) {
        if (!wave.entries.some((e) => e.enemyTypeId === "skattvatte")) continue;
        appearances++;
        for (const entry of wave.entries) {
          if (entry.enemyTypeId === "skattvatte") continue;
          const peer = byId.get(entry.enemyTypeId)!;
          expect(
            skattvatte.bounty,
            `${level.id}: skattvatte must out-bounty peer "${peer.id}" 3x`,
          ).toBeGreaterThan(3 * peer.bounty);
        }
      }
    }
    // sprinkled rarely from level05 on — present, but never common
    expect(appearances).toBeGreaterThanOrEqual(4);
    expect(appearances).toBeLessThanOrEqual(8);
    // never before level05
    for (const level of bundle.levels.slice(0, 4)) {
      for (const wave of level.waves) {
        expect(
          wave.entries.some((e) => e.enemyTypeId === "skattvatte"),
          `${level.id} must not contain skattvatte yet`,
        ).toBe(false);
      }
    }
  });
});

describe("meta upgrade economy", () => {
  function rankCost(cost: number, growth: number, rank: number): number {
    return Math.round(cost * Math.pow(growth, rank - 1));
  }
  function maxOutCost(u: {
    cost: number;
    costGrowth: number;
    maxRank: number;
  }): number {
    let total = 0;
    for (let r = 1; r <= u.maxRank; r++) {
      total += rankCost(u.cost, u.costGrowth, r);
    }
    return total;
  }

  it("keeps the four upgrades, deeper and escalating", () => {
    const bundle = buildContent();
    const byId = (id: string) => bundle.metaUpgrades.find((u) => u.id === id)!;
    expect(bundle.metaUpgrades).toHaveLength(4);

    const expected: Record<
      string,
      { cost: number; costGrowth: number; maxRank: number }
    > = {
      bjornstyrka: { cost: 100, costGrowth: 1.7, maxRank: 5 },
      ugglesyn: { cost: 120, costGrowth: 1.7, maxRank: 4 },
      skattkista: { cost: 80, costGrowth: 1.6, maxRank: 5 },
      stugvarme: { cost: 140, costGrowth: 1.8, maxRank: 4 },
    };
    for (const [id, exp] of Object.entries(expected)) {
      const def = byId(id);
      expect(def.cost, `${id} cost`).toBe(exp.cost);
      expect(def.costGrowth, `${id} costGrowth`).toBe(exp.costGrowth);
      expect(def.maxRank, `${id} maxRank`).toBe(exp.maxRank);
    }
  });

  it("maxing the whole shop costs exactly the documented 6073 points", () => {
    const bundle = buildContent();
    const byId = (id: string) => bundle.metaUpgrades.find((u) => u.id === id)!;
    // per-upgrade totals documented in metaUpgrades.ts
    expect(maxOutCost(byId("bjornstyrka"))).toBe(1885);
    expect(maxOutCost(byId("ugglesyn"))).toBe(1261);
    expect(maxOutCost(byId("skattkista"))).toBe(1265);
    expect(maxOutCost(byId("stugvarme"))).toBe(1662);

    const total = bundle.metaUpgrades.reduce((s, u) => s + maxOutCost(u), 0);
    expect(total).toBe(6073);
    // sanity: several won maps of earnings (a won map yields ~1100+ points),
    // not the single-map shop of old (~860)
    expect(total).toBeGreaterThan(5 * 860);
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

  it("damage rises with each level on attacking towers", () => {
    for (const tower of buildContent().towers) {
      if (tower.levels.every((l) => l.damage === 0)) continue; // economy tower
      for (let i = 1; i < tower.levels.length; i++) {
        expect(tower.levels[i]!.damage).toBeGreaterThan(
          tower.levels[i - 1]!.damage,
        );
      }
    }
  });

  it("nacken splashes on every level, wider per level, hitting softer than runsten", () => {
    const bundle = buildContent();
    const nacken = bundle.towers.find((t) => t.id === "nacken")!;
    const runsten = bundle.towers.find((t) => t.id === "runsten")!;
    expect(nacken).toBeDefined();
    expect(nacken.unlockPoints).toBe(300);
    for (const level of nacken.levels) {
      expect(level.splashRadius).toBeDefined();
      expect(level.damage).toBeGreaterThan(0);
    }
    for (let i = 1; i < nacken.levels.length; i++) {
      expect(nacken.levels[i]!.splashRadius!).toBeGreaterThan(
        nacken.levels[i - 1]!.splashRadius!,
      );
    }
    // splash multiplies the hit across the swarm, so per-target damage must
    // stay below the single-target heavy hitter at every level
    for (let i = 0; i < nacken.levels.length; i++) {
      expect(nacken.levels[i]!.damage).toBeLessThan(runsten.levels[i]!.damage);
    }
  });

  it("only nacken has splash", () => {
    for (const tower of buildContent().towers) {
      if (tower.id === "nacken") continue;
      for (const level of tower.levels) {
        expect(
          level.splashRadius,
          `${tower.id} should not splash`,
        ).toBeUndefined();
      }
    }
  });

  it("vardtradet never attacks and pays rising income every wave", () => {
    const vardtradet = buildContent().towers.find(
      (t) => t.id === "vardtradet",
    )!;
    expect(vardtradet).toBeDefined();
    expect(vardtradet.unlockPoints).toBe(800);
    for (const level of vardtradet.levels) {
      expect(level.damage).toBe(0);
      expect(level.incomePerWave).toBeDefined();
      expect(level.incomePerWave!).toBeGreaterThan(0);
    }
    for (let i = 1; i < vardtradet.levels.length; i++) {
      expect(vardtradet.levels[i]!.incomePerWave!).toBeGreaterThan(
        vardtradet.levels[i - 1]!.incomePerWave!,
      );
    }
  });

  it("only vardtradet has incomePerWave", () => {
    for (const tower of buildContent().towers) {
      if (tower.id === "vardtradet") continue;
      for (const level of tower.levels) {
        expect(
          level.incomePerWave,
          `${tower.id} should not generate income`,
        ).toBeUndefined();
      }
    }
  });

  it("sollykta petrifies on every level, deeper and longer per level", () => {
    const sollykta = buildContent().towers.find((t) => t.id === "sollykta")!;
    expect(sollykta).toBeDefined();
    for (const level of sollykta.levels) {
      expect(level.slow).toBeDefined();
    }
    for (let i = 1; i < sollykta.levels.length; i++) {
      expect(sollykta.levels[i]!.slow!.factor).toBeLessThan(
        sollykta.levels[i - 1]!.slow!.factor,
      );
      expect(sollykta.levels[i]!.slow!.durationTicks).toBeGreaterThan(
        sollykta.levels[i - 1]!.slow!.durationTicks,
      );
    }
  });

  it("only sollykta has a slow — the other towers hit clean", () => {
    for (const tower of buildContent().towers) {
      if (tower.id === "sollykta") continue;
      for (const level of tower.levels) {
        expect(level.slow, `${tower.id} should not slow`).toBeUndefined();
      }
    }
  });
});

describe("sagner", () => {
  it("every condition references existing enemy and level ids", () => {
    const bundle = buildContent();
    const enemyIds = new Set(bundle.enemies.map((e) => e.id));
    const levelIds = new Set(bundle.levels.map((l) => l.id));
    for (const sagen of bundle.sagner) {
      if (sagen.condition.kind === "kills") {
        expect(
          enemyIds.has(sagen.condition.enemyTypeId),
          `sagen "${sagen.id}" references enemy "${sagen.condition.enemyTypeId}"`,
        ).toBe(true);
      }
      if (sagen.condition.kind === "winLevel") {
        expect(
          levelIds.has(sagen.condition.levelId),
          `sagen "${sagen.id}" references level "${sagen.condition.levelId}"`,
        ).toBe(true);
      }
    }
  });

  it("covers the expected deeds", () => {
    const bundle = buildContent();
    const conditions = bundle.sagner.map((s) => s.condition);
    expect(conditions).toContainEqual({
      kind: "kills",
      enemyTypeId: "troll",
      count: 1,
    });
    expect(conditions).toContainEqual({
      kind: "kills",
      enemyTypeId: "vatte",
      count: 50,
    });
    expect(conditions).toContainEqual({
      kind: "kills",
      enemyTypeId: "myling",
      count: 25,
    });
    expect(conditions).toContainEqual({ kind: "petrified", count: 30 });
    expect(conditions).toContainEqual({ kind: "winLevel", levelId: "level01" });
    expect(conditions).toContainEqual({ kind: "winLevel", levelId: "level02" });
    expect(conditions).toContainEqual({ kind: "flawlessWin" });
    // the treasure-carrier hunt: ten gold sacks claimed
    expect(conditions).toContainEqual({
      kind: "kills",
      enemyTypeId: "skattvatte",
      count: 10,
    });

    const firstTrollKill = bundle.sagner.find(
      (s) => s.condition.kind === "kills" && s.condition.enemyTypeId === "troll",
    )!;
    expect(firstTrollKill.title).toBe("Trollet i skogen");
    const flawless = bundle.sagner.find(
      (s) => s.condition.kind === "flawlessWin",
    )!;
    expect(flawless.title).toBe("Obefläckad");
    const treasureHunt = bundle.sagner.find(
      (s) =>
        s.condition.kind === "kills" &&
        s.condition.enemyTypeId === "skattvatte",
    )!;
    expect(treasureHunt.title).toBe("Skattvättens flykt");
  });

  it("integrity check fires on bogus condition enemyTypeIds and levelIds", () => {
    const broken: ContentBundle = structuredClone(buildContent());
    const killsSagen = broken.sagner.find((s) => s.condition.kind === "kills")!;
    if (killsSagen.condition.kind === "kills") {
      killsSagen.condition.enemyTypeId = "gengangare";
    }
    const winSagen = broken.sagner.find(
      (s) => s.condition.kind === "winLevel",
    )!;
    if (winSagen.condition.kind === "winLevel") {
      winSagen.condition.levelId = "level99";
    }

    const violations = collectIntegrityViolations(broken);
    expect(violations).toHaveLength(2);
    expect(violations.join("\n")).toContain('"gengangare"');
    expect(violations.join("\n")).toContain('"level99"');
  });

  it("integrity check flags duplicate sagen ids", () => {
    const broken: ContentBundle = structuredClone(buildContent());
    broken.sagner.push(structuredClone(broken.sagner[0]!));
    const violations = collectIntegrityViolations(broken);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain(`sagen id "${broken.sagner[0]!.id}"`);
  });
});
