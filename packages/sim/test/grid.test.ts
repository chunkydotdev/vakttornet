import { describe, expect, it } from "vitest";
import { setup } from "./fixtures";

describe("map parsing", () => {
  it("parses the map into a tile grid with correct dimensions and kinds", () => {
    const { sim } = setup();
    expect(sim.state.grid.cols).toBe(7);
    expect(sim.state.grid.rows).toBe(5);
    expect(sim.state.grid.tiles[2]![0]).toBe("spawn");
    expect(sim.state.grid.tiles[2]![6]).toBe("exit");
    expect(sim.state.grid.tiles[2]![3]).toBe("path");
    expect(sim.state.grid.tiles[0]![0]).toBe("buildable");
  });

  it("computes the path as tile-center waypoints from spawn to exit inclusive", () => {
    const { sim } = setup();
    expect(sim.state.path).toEqual([
      { x: 0.5, y: 2.5 },
      { x: 1.5, y: 2.5 },
      { x: 2.5, y: 2.5 },
      { x: 3.5, y: 2.5 },
      { x: 4.5, y: 2.5 },
      { x: 5.5, y: 2.5 },
      { x: 6.5, y: 2.5 },
    ]);
  });

  it("follows bends in the path in order", () => {
    const { sim } = setup({
      map: ["S##", "P##", "PPE"],
    });
    expect(sim.state.path).toEqual([
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 1.5 },
      { x: 0.5, y: 2.5 },
      { x: 1.5, y: 2.5 },
      { x: 2.5, y: 2.5 },
    ]);
  });

  it("throws a descriptive error on unknown map characters", () => {
    expect(() => setup({ map: ["SPE", "..X", "..."] })).toThrowError(
      /unknown map character "X" at row 1, col 2/,
    );
  });

  it("throws a descriptive error when spawn cannot reach exit", () => {
    expect(() => setup({ map: ["S#E", "###", "..."] })).toThrowError(
      /no path from spawn/,
    );
  });

  it("throws when a wave references an unknown enemy type", () => {
    expect(() =>
      setup({
        waves: [{ entries: [{ enemyTypeId: "ghost", count: 1, spacingTicks: 1 }] }],
      }),
    ).toThrowError(/unknown enemy type "ghost"/);
  });
});
