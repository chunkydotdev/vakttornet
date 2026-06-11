/**
 * Map parsing and pathfinding. Pure helpers — no sim state.
 */
import { TILE_CHARS, type TileKind, type Vec } from "./types";

export interface ParsedGrid {
  cols: number;
  rows: number;
  tiles: TileKind[][];
  spawn: { col: number; row: number };
  exit: { col: number; row: number };
}

/** Tiles BFS may cross. "water" is deliberately absent: it behaves exactly
 * like "blocked" for pathing (and for building — see placeTower). */
const WALKABLE: ReadonlySet<TileKind> = new Set(["path", "spawn", "exit"]);

/**
 * Parse LevelDef.map rows into a tile grid. Throws a descriptive Error on
 * malformed input (ragged rows, unknown characters, missing/duplicate S/E).
 * The zod schema already enforces most of this, but the sim must not trust
 * its inputs to have been validated.
 */
export function parseMap(map: string[]): ParsedGrid {
  if (map.length === 0 || map[0]!.length === 0) {
    throw new Error("Malformed map: map must have at least one non-empty row");
  }
  const rows = map.length;
  const cols = map[0]!.length;
  const tiles: TileKind[][] = [];
  let spawn: { col: number; row: number } | undefined;
  let exit: { col: number; row: number } | undefined;

  for (let row = 0; row < rows; row++) {
    const line = map[row]!;
    if (line.length !== cols) {
      throw new Error(
        `Malformed map: row ${row} has length ${line.length}, expected ${cols}`,
      );
    }
    const tileRow: TileKind[] = [];
    for (let col = 0; col < cols; col++) {
      const ch = line[col]!;
      const kind = TILE_CHARS[ch];
      if (!kind) {
        throw new Error(
          `Malformed map: unknown map character "${ch}" at row ${row}, col ${col}`,
        );
      }
      if (kind === "spawn") {
        if (spawn) throw new Error("Malformed map: more than one spawn (S) tile");
        spawn = { col, row };
      }
      if (kind === "exit") {
        if (exit) throw new Error("Malformed map: more than one exit (E) tile");
        exit = { col, row };
      }
      tileRow.push(kind);
    }
    tiles.push(tileRow);
  }

  if (!spawn) throw new Error("Malformed map: no spawn (S) tile");
  if (!exit) throw new Error("Malformed map: no exit (E) tile");

  return { cols, rows, tiles, spawn, exit };
}

/**
 * BFS from spawn to exit over path/spawn/exit tiles (4-directional).
 * Returns tile-center waypoints (col + 0.5, row + 0.5) from spawn to exit,
 * inclusive. Throws if the exit is unreachable.
 */
export function computePath(grid: ParsedGrid): Vec[] {
  const { cols, rows, tiles, spawn, exit } = grid;
  const key = (col: number, row: number) => row * cols + col;
  // cameFrom maps a visited tile key to the key it was reached from.
  const cameFrom = new Map<number, number>();
  cameFrom.set(key(spawn.col, spawn.row), -1);
  const queue: Array<{ col: number; row: number }> = [spawn];
  const deltas = [
    { dc: 1, dr: 0 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 0, dr: -1 },
  ];

  let found = false;
  while (queue.length > 0 && !found) {
    const cur = queue.shift()!;
    for (const { dc, dr } of deltas) {
      const col = cur.col + dc;
      const row = cur.row + dr;
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const k = key(col, row);
      if (cameFrom.has(k)) continue;
      const kind = tiles[row]![col]!;
      if (!WALKABLE.has(kind)) continue;
      cameFrom.set(k, key(cur.col, cur.row));
      if (col === exit.col && row === exit.row) {
        found = true;
        break;
      }
      queue.push({ col, row });
    }
  }

  const exitKey = key(exit.col, exit.row);
  if (!cameFrom.has(exitKey)) {
    throw new Error(
      "Malformed map: no path from spawn (S) to exit (E) along path tiles",
    );
  }

  // Walk back from exit to spawn, then reverse into spawn→exit order.
  const reversed: Vec[] = [];
  let k = exitKey;
  while (k !== -1) {
    const col = k % cols;
    const row = (k - col) / cols;
    reversed.push({ x: col + 0.5, y: row + 0.5 });
    k = cameFrom.get(k)!;
  }
  return reversed.reverse();
}
