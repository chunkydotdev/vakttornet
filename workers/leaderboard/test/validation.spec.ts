import { describe, expect, it } from "vitest";
import { buildContent, level01 } from "@vakttornet/content";
import { NAME_PATTERN } from "../src/api";
import {
  buildContentDerived,
  compareEntries,
  countBuildableTiles,
  matchOrigin,
  validateSubmit,
  type ContentDerived,
} from "../src/validation";

const derived: ContentDerived = buildContentDerived();
const level01Caps = derived.get("level01")!;

/** A submission that must pass validation, for per-field mutation tests. */
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    levelId: "level01",
    name: "Saga",
    vardtrad: 3,
    score: 500,
    ...overrides,
  };
}

describe("buildContentDerived", () => {
  it("has caps for every level in the content bundle", () => {
    const content = buildContent();
    expect(content.levels.length).toBeGreaterThan(0);
    for (const level of content.levels) {
      const caps = derived.get(level.id);
      expect(caps, `caps missing for ${level.id}`).toBeDefined();
      expect(Number.isInteger(caps!.vardtradCap)).toBe(true);
      expect(caps!.vardtradCap).toBeGreaterThan(0);
      expect(Number.isInteger(caps!.scoreCeiling)).toBe(true);
      expect(caps!.scoreCeiling).toBeGreaterThan(0);
    }
    expect(derived.size).toBe(content.levels.length);
  });

  it("level01 vardtrad cap equals the buildable-tile count of the actual map", () => {
    // Independent count straight off the level01 map data.
    let dots = 0;
    for (const row of level01.map) {
      for (const ch of row) if (ch === ".") dots++;
    }
    expect(level01Caps.vardtradCap).toBe(dots);
    expect(countBuildableTiles(level01.map)).toBe(dots);
  });

  it("score ceiling exceeds the raw bounty+bonus sum (margin applied)", () => {
    const content = buildContent();
    const bounty = new Map(content.enemies.map((e) => [e.id, e.bounty]));
    for (const level of content.levels) {
      const totalBounty = level.waves
        .flatMap((w) => w.entries)
        .reduce((s, e) => s + e.count * bounty.get(e.enemyTypeId)!, 0);
      expect(derived.get(level.id)!.scoreCeiling).toBeGreaterThan(totalBounty);
    }
  });
});

describe("validateSubmit — accepts", () => {
  it("accepts a valid submission", () => {
    const result = validateSubmit(validBody(), derived);
    expect(result).toEqual({ ok: true, value: validBody() });
  });

  it("trims surrounding whitespace from the name", () => {
    const result = validateSubmit(validBody({ name: "  Saga  " }), derived);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("Saga");
  });

  it("accepts Swedish characters, digits, underscore, hyphen, inner space", () => {
    for (const name of ["Åsa-Örn", "vätte_99", "Tomten Nr 1", "åäöÅÄÖ"]) {
      expect(validateSubmit(validBody({ name }), derived).ok).toBe(true);
    }
  });

  it("accepts boundary values: vardtrad 0 and exactly at cap, score 0 and at ceiling", () => {
    expect(validateSubmit(validBody({ vardtrad: 0, score: 0 }), derived).ok).toBe(true);
    expect(
      validateSubmit(validBody({ vardtrad: level01Caps.vardtradCap }), derived).ok,
    ).toBe(true);
    expect(
      validateSubmit(validBody({ score: level01Caps.scoreCeiling }), derived).ok,
    ).toBe(true);
  });
});

describe("validateSubmit — rejects names", () => {
  it.each([
    ["1-char", "A"],
    ["13-char", "AAAAAAAAAAAAA"],
    ["emoji", "Saga🌲"],
    ["empty", ""],
    ["whitespace only", "   "],
    ["illegal punctuation", "Saga!"],
    ["angle brackets", "<script>"],
  ])("rejects %s name with invalid-name", (_label, name) => {
    expect(validateSubmit(validBody({ name }), derived)).toEqual({
      ok: false,
      error: "invalid-name",
    });
  });

  it("rejects a non-string name with invalid-name", () => {
    expect(validateSubmit(validBody({ name: 42 }), derived)).toEqual({
      ok: false,
      error: "invalid-name",
    });
  });

  it("NAME_PATTERN itself enforces 2-12 chars", () => {
    expect(NAME_PATTERN.test("ab")).toBe(true);
    expect(NAME_PATTERN.test("abcdefghijkl")).toBe(true);
    expect(NAME_PATTERN.test("a")).toBe(false);
    expect(NAME_PATTERN.test("abcdefghijklm")).toBe(false);
  });
});

describe("validateSubmit — rejects levels", () => {
  it("rejects an unknown level with unknown-level", () => {
    expect(validateSubmit(validBody({ levelId: "level99" }), derived)).toEqual({
      ok: false,
      error: "unknown-level",
    });
  });

  it("rejects a non-string levelId with unknown-level", () => {
    expect(validateSubmit(validBody({ levelId: 1 }), derived)).toEqual({
      ok: false,
      error: "unknown-level",
    });
  });
});

describe("validateSubmit — rejects out-of-bounds numbers", () => {
  it("rejects vardtrad over the level01 cap computed from the actual map", () => {
    // Expected cap derived independently from the map data.
    const expectedCap = level01.map
      .join("")
      .split("")
      .filter((c) => c === ".").length;
    expect(
      validateSubmit(validBody({ vardtrad: expectedCap }), derived).ok,
    ).toBe(true);
    expect(
      validateSubmit(validBody({ vardtrad: expectedCap + 1 }), derived),
    ).toEqual({ ok: false, error: "out-of-bounds" });
  });

  it("rejects score over the ceiling", () => {
    expect(
      validateSubmit(
        validBody({ score: level01Caps.scoreCeiling + 1 }),
        derived,
      ),
    ).toEqual({ ok: false, error: "out-of-bounds" });
  });

  it.each([
    ["float vardtrad", { vardtrad: 1.5 }],
    ["float score", { score: 10.5 }],
    ["NaN score", { score: Number.NaN }],
    ["Infinity score", { score: Number.POSITIVE_INFINITY }],
    ["string vardtrad", { vardtrad: "3" }],
    ["string score", { score: "500" }],
    ["negative vardtrad", { vardtrad: -1 }],
    ["negative score", { score: -1 }],
  ])("rejects %s with out-of-bounds", (_label, overrides) => {
    expect(validateSubmit(validBody(overrides), derived)).toEqual({
      ok: false,
      error: "out-of-bounds",
    });
  });
});

describe("validateSubmit — rejects malformed bodies", () => {
  it.each([
    ["null", null],
    ["array", []],
    ["string", "hello"],
    ["number", 7],
  ])("rejects %s body with bad-request", (_label, body) => {
    expect(validateSubmit(body, derived)).toEqual({
      ok: false,
      error: "bad-request",
    });
  });
});

describe("compareEntries (ranking comparator)", () => {
  const entry = (vardtrad: number, score: number, createdAt: string) => ({
    vardtrad,
    score,
    createdAt,
  });

  it("higher vardtrad ranks first regardless of score", () => {
    const a = entry(5, 100, "2026-06-12T10:00:00Z");
    const b = entry(4, 9999, "2026-06-12T09:00:00Z");
    expect(compareEntries(a, b)).toBeLessThan(0);
    expect(compareEntries(b, a)).toBeGreaterThan(0);
  });

  it("on equal vardtrad, higher score ranks first", () => {
    const a = entry(5, 200, "2026-06-12T10:00:00Z");
    const b = entry(5, 100, "2026-06-12T09:00:00Z");
    expect(compareEntries(a, b)).toBeLessThan(0);
  });

  it("on full ties, earlier createdAt ranks first (first to set the mark)", () => {
    const early = entry(5, 100, "2026-06-12T09:00:00Z");
    const late = entry(5, 100, "2026-06-12T10:00:00Z");
    expect(compareEntries(early, late)).toBeLessThan(0);
    expect(compareEntries(late, early)).toBeGreaterThan(0);
  });

  it("identical entries compare equal", () => {
    const a = entry(5, 100, "2026-06-12T09:00:00Z");
    expect(compareEntries(a, { ...a })).toBe(0);
  });

  it("sorts a board into contract order", () => {
    const board = [
      entry(3, 900, "2026-06-12T08:00:00Z"),
      entry(5, 100, "2026-06-12T10:00:00Z"),
      entry(5, 300, "2026-06-12T11:00:00Z"),
      entry(5, 300, "2026-06-12T09:00:00Z"),
    ];
    const sorted = [...board].sort(compareEntries);
    expect(sorted).toEqual([
      entry(5, 300, "2026-06-12T09:00:00Z"),
      entry(5, 300, "2026-06-12T11:00:00Z"),
      entry(5, 100, "2026-06-12T10:00:00Z"),
      entry(3, 900, "2026-06-12T08:00:00Z"),
    ]);
  });
});

describe("matchOrigin (CORS)", () => {
  const allowed = "https://chunkydotdev.github.io,http://localhost:5173";

  it("returns the matched origin when listed", () => {
    expect(matchOrigin("http://localhost:5173", allowed)).toBe(
      "http://localhost:5173",
    );
    expect(matchOrigin("https://chunkydotdev.github.io", allowed)).toBe(
      "https://chunkydotdev.github.io",
    );
  });

  it("returns null for unlisted origins", () => {
    expect(matchOrigin("https://evil.example", allowed)).toBeNull();
  });

  it("returns null when the Origin header is missing", () => {
    expect(matchOrigin(null, allowed)).toBeNull();
  });

  it("never wildcards: prefixes, suffixes, and * are rejected", () => {
    expect(matchOrigin("http://localhost:5173.evil.example", allowed)).toBeNull();
    expect(matchOrigin("https://evil.chunkydotdev.github.io", allowed)).toBeNull();
    expect(matchOrigin("*", allowed)).toBeNull();
  });

  it("handles whitespace around the comma-separated list", () => {
    expect(
      matchOrigin("http://localhost:5173", " https://a.example , http://localhost:5173 "),
    ).toBe("http://localhost:5173");
  });

  it("is scheme-sensitive", () => {
    expect(matchOrigin("https://localhost:5173", allowed)).toBeNull();
  });
});
