/**
 * Canvas renderer — draws the board from sim.state every animation frame.
 * Pure read-only consumer of the sim; all mutation happens through commands
 * issued by the React layer.
 *
 * Positions from the sim are in tile space (1.0 = one tile, tile centers at
 * col + 0.5). We multiply by TILE_PX and interpolate prevPos -> pos with the
 * loop's alpha for smooth 60 fps movement over 30 Hz sim steps.
 */
import { manifest } from "@vakttornet/assets/manifest";
import type {
  MetaModifiers,
  Sim,
  SimEvent,
  TileKind,
  TowerInstance,
  Vec,
} from "@vakttornet/sim";
import type { ContentBundle, TowerDef } from "@vakttornet/content";

export const TILE_PX = 64;

/**
 * Look up a manifest URL by a plain-string asset id (content defs carry
 * `assetId: string`, while the manifest is keyed by the AssetId union).
 */
export function assetUrl(id: string): string | undefined {
  return (manifest as Record<string, string>)[id];
}

const TILE_ASSET: Record<TileKind, string> = {
  buildable: "tile.grass",
  path: "tile.path",
  blocked: "tile.blocked",
  spawn: "tile.spawn",
  exit: "tile.exit",
};

/** Fallback fills if an SVG failed to load — the run must stay playable. */
const TILE_FALLBACK: Record<TileKind, string> = {
  buildable: "#1d2a1d",
  blocked: "#11151c",
  path: "#3a3326",
  spawn: "#3a2630",
  exit: "#26303a",
};

export type ImageStore = Map<string, HTMLImageElement>;

/** Preload every manifest SVG into decoded images before the run starts. */
export async function loadImages(): Promise<ImageStore> {
  const store: ImageStore = new Map();
  await Promise.all(
    Object.entries(manifest).map(
      ([id, url]) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            store.set(id, img);
            resolve();
          };
          img.onerror = () => {
            console.warn(`[vakttornet] failed to load asset "${id}" (${url})`);
            resolve();
          };
          img.src = url;
        }),
    ),
  );
  return store;
}

export interface TilePos {
  col: number;
  row: number;
}

/** Mirror of sim.placeTower's checks, used for the green/red ghost preview. */
export function isPlaceable(
  sim: Sim,
  content: ContentBundle,
  towerTypeId: string,
  tile: TilePos,
): boolean {
  const s = sim.state;
  if (tile.col < 0 || tile.row < 0 || tile.col >= s.grid.cols || tile.row >= s.grid.rows) {
    return false;
  }
  if (s.grid.tiles[tile.row]?.[tile.col] !== "buildable") return false;
  if (s.towers.some((t) => t.tile.col === tile.col && t.tile.row === tile.row)) return false;
  const def = content.towers.find((t) => t.id === towerTypeId);
  const level1 = def?.levels[0];
  if (!level1) return false;
  return s.gold >= level1.cost;
}

/** Renderer-only pointer/selection state, mutated directly (no React). */
export interface PointerState {
  hoverTile: TilePos | null;
  /** Tower type id armed for placement, or null. */
  armedTowerTypeId: string | null;
  selectedTowerId: number | null;
}

interface FloatingText {
  text: string;
  color: string;
  x: number;
  y: number;
  bornAt: number;
}

const FLOAT_LIFE_MS = 1100;
const FLOAT_RISE_PX = 30;

export class Renderer {
  readonly pointer: PointerState = {
    hoverTile: null,
    armedTowerTypeId: null,
    selectedTowerId: null,
  };

  private readonly ctx: CanvasRenderingContext2D;
  private readonly dpr: number;
  private readonly cssWidth: number;
  private readonly cssHeight: number;
  private readonly towerDefs: Map<string, TowerDef>;
  private readonly exitPos: Vec;
  private floats: FloatingText[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    private readonly sim: Sim,
    private readonly content: ContentBundle,
    private readonly images: ImageStore,
    private readonly meta: MetaModifiers,
  ) {
    const { cols, rows } = sim.state.grid;
    this.cssWidth = cols * TILE_PX;
    this.cssHeight = rows * TILE_PX;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(this.cssWidth * this.dpr);
    canvas.height = Math.round(this.cssHeight * this.dpr);
    canvas.style.width = `${this.cssWidth}px`;
    canvas.style.height = `${this.cssHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;

    this.towerDefs = new Map(content.towers.map((t) => [t.id, t]));
    const lastWaypoint = sim.state.path[sim.state.path.length - 1];
    this.exitPos = lastWaypoint ?? { x: cols / 2, y: rows / 2 };
  }

  /** Spawn floating combat text from this tick batch's events. */
  handleEvents(events: SimEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case "enemyDied":
          this.addFloat(`+${event.bounty}`, "#fbbf24", event.at);
          break;
        case "enemyLeaked":
          this.addFloat("-1 ♥", "#f87171", this.exitPos);
          break;
        case "waveCleared":
          if (event.bonus > 0) {
            this.addFloat(`Wave cleared +${event.bonus}`, "#a78bfa", {
              x: this.sim.state.grid.cols / 2,
              y: this.sim.state.grid.rows / 2,
            });
          }
          break;
      }
    }
  }

  private addFloat(text: string, color: string, at: Vec): void {
    this.floats.push({
      text,
      color,
      x: at.x * TILE_PX,
      y: at.y * TILE_PX - 10,
      bornAt: performance.now(),
    });
  }

  draw(alpha: number): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    this.drawTiles();
    this.drawSelectedRange();
    this.drawTowers();
    this.drawEnemies(alpha);
    this.drawProjectiles(alpha);
    this.drawPlacementPreview();
    this.drawFloats();

    // Subtle board frame so the edge tiles don't bleed into the page.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, this.cssWidth - 1, this.cssHeight - 1);
  }

  private image(id: string | undefined): HTMLImageElement | undefined {
    return id === undefined ? undefined : this.images.get(id);
  }

  private drawTiles(): void {
    const { ctx } = this;
    const { tiles, cols, rows } = this.sim.state.grid;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const kind = tiles[row]?.[col];
        if (kind === undefined) continue;
        const img = this.image(TILE_ASSET[kind]);
        if (img) {
          ctx.drawImage(img, col * TILE_PX, row * TILE_PX, TILE_PX, TILE_PX);
        } else {
          ctx.fillStyle = TILE_FALLBACK[kind];
          ctx.fillRect(col * TILE_PX, row * TILE_PX, TILE_PX, TILE_PX);
        }
      }
    }
  }

  private towerRangePx(typeId: string, level: number): number {
    const def = this.towerDefs.get(typeId);
    const lvl = def?.levels[level - 1];
    if (!lvl) return 0;
    return lvl.range * this.meta.rangeMult * TILE_PX;
  }

  private drawRangeCircle(cx: number, cy: number, radiusPx: number, ok = true): void {
    if (radiusPx <= 0) return;
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.fillStyle = ok ? "rgba(124, 158, 255, 0.10)" : "rgba(248, 113, 113, 0.10)";
    ctx.fill();
    ctx.strokeStyle = ok ? "rgba(124, 158, 255, 0.45)" : "rgba(248, 113, 113, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawSelectedRange(): void {
    const id = this.pointer.selectedTowerId;
    if (id === null) return;
    const tower = this.sim.state.towers.find((t) => t.id === id);
    if (!tower) return;
    const cx = (tower.tile.col + 0.5) * TILE_PX;
    const cy = (tower.tile.row + 0.5) * TILE_PX;
    this.drawRangeCircle(cx, cy, this.towerRangePx(tower.typeId, tower.level));

    // Highlight the selected tower's tile.
    this.ctx.strokeStyle = "rgba(124, 158, 255, 0.8)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(tower.tile.col * TILE_PX + 2, tower.tile.row * TILE_PX + 2, TILE_PX - 4, TILE_PX - 4);
  }

  private drawTowers(): void {
    for (const tower of this.sim.state.towers) {
      this.drawTowerSprite(tower);
      this.drawLevelPips(tower);
    }
  }

  private drawTowerSprite(tower: TowerInstance): void {
    const def = this.towerDefs.get(tower.typeId);
    const img = this.image(def?.assetId ?? `tower.${tower.typeId}`);
    const x = tower.tile.col * TILE_PX;
    const y = tower.tile.row * TILE_PX;
    if (img) {
      this.ctx.drawImage(img, x, y, TILE_PX, TILE_PX);
    } else {
      this.ctx.fillStyle = "#7c9eff";
      this.ctx.beginPath();
      this.ctx.arc(x + TILE_PX / 2, y + TILE_PX / 2, 18, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawLevelPips(tower: TowerInstance): void {
    const { ctx } = this;
    const cx = (tower.tile.col + 0.5) * TILE_PX;
    const y = (tower.tile.row + 1) * TILE_PX - 6;
    const spacing = 9;
    const startX = cx - ((tower.level - 1) * spacing) / 2;
    for (let i = 0; i < tower.level; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * spacing, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawEnemies(alpha: number): void {
    const { ctx } = this;
    const enemyDefs = this.content.enemies;
    for (const enemy of this.sim.state.enemies) {
      const x = lerp(enemy.prevPos.x, enemy.pos.x, alpha) * TILE_PX;
      const y = lerp(enemy.prevPos.y, enemy.pos.y, alpha) * TILE_PX;
      const def = enemyDefs.find((e) => e.id === enemy.typeId);
      const img = this.image(def?.assetId ?? `enemy.${enemy.typeId}`);
      const size = 48;
      if (img) {
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      } else {
        ctx.fillStyle = "#f87171";
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      this.drawHpBar(x, y - size / 2 - 7, enemy.hp / enemy.maxHp);
    }
  }

  private drawHpBar(cx: number, cy: number, ratio: number): void {
    const { ctx } = this;
    const clamped = Math.max(0, Math.min(1, ratio));
    const width = 36;
    const height = 5;
    const x = cx - width / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(x - 1, cy - 1, width + 2, height + 2);
    // green (120) -> red (0) as hp drops
    ctx.fillStyle = `hsl(${Math.round(120 * clamped)}, 75%, 48%)`;
    ctx.fillRect(x, cy, width * clamped, height);
  }

  private drawProjectiles(alpha: number): void {
    const { ctx } = this;
    const size = 20;
    for (const projectile of this.sim.state.projectiles) {
      const x = lerp(projectile.prevPos.x, projectile.pos.x, alpha) * TILE_PX;
      const y = lerp(projectile.prevPos.y, projectile.pos.y, alpha) * TILE_PX;
      const img = this.image(`projectile.${projectile.towerTypeId}`);
      if (img) {
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      } else {
        ctx.fillStyle = "#e8ecf3";
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawPlacementPreview(): void {
    const { armedTowerTypeId, hoverTile } = this.pointer;
    if (!armedTowerTypeId || !hoverTile) return;
    const def = this.towerDefs.get(armedTowerTypeId);
    if (!def) return;

    const ok = isPlaceable(this.sim, this.content, armedTowerTypeId, hoverTile);
    const cx = (hoverTile.col + 0.5) * TILE_PX;
    const cy = (hoverTile.row + 0.5) * TILE_PX;
    const x = hoverTile.col * TILE_PX;
    const y = hoverTile.row * TILE_PX;
    const { ctx } = this;

    this.drawRangeCircle(cx, cy, this.towerRangePx(armedTowerTypeId, 1), ok);

    ctx.fillStyle = ok ? "rgba(74, 222, 128, 0.22)" : "rgba(248, 113, 113, 0.28)";
    ctx.fillRect(x, y, TILE_PX, TILE_PX);
    ctx.strokeStyle = ok ? "rgba(74, 222, 128, 0.9)" : "rgba(248, 113, 113, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE_PX - 2, TILE_PX - 2);

    const img = this.image(def.assetId);
    if (img) {
      ctx.globalAlpha = 0.65;
      ctx.drawImage(img, x, y, TILE_PX, TILE_PX);
      ctx.globalAlpha = 1;
    }
  }

  private drawFloats(): void {
    if (this.floats.length === 0) return;
    const { ctx } = this;
    const now = performance.now();
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    this.floats = this.floats.filter((f) => now - f.bornAt < FLOAT_LIFE_MS);
    for (const float of this.floats) {
      const t = (now - float.bornAt) / FLOAT_LIFE_MS;
      const y = float.y - t * FLOAT_RISE_PX;
      ctx.globalAlpha = 1 - t * t;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
      ctx.lineWidth = 3;
      ctx.strokeText(float.text, float.x, y);
      ctx.fillStyle = float.color;
      ctx.fillText(float.text, float.x, y);
    }
    ctx.globalAlpha = 1;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
