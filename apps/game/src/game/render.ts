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
import type { ContentBundle, EnemyDef, TowerDef, TowerLevel } from "@vakttornet/content";

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
  water: "tile.water",
};

/** Fallback fills if an SVG failed to load — the run must stay playable. */
const TILE_FALLBACK: Record<TileKind, string> = {
  buildable: "#1d2a1d",
  blocked: "#11151c",
  path: "#3a3326",
  spawn: "#3a2630",
  exit: "#26303a",
  water: "#16293c",
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
  /** Petrify callouts render smaller + italic to stand apart from gold text. */
  italic?: boolean;
  /** Boss callouts: bigger type, slower rise, longer dramatic fade. */
  big?: boolean;
}

const FLOAT_LIFE_MS = 1100;
const FLOAT_RISE_PX = 30;
const BOSS_FLOAT_LIFE_MS = 2000;
const BOSS_FLOAT_RISE_PX = 18;

/** Brief expanding ring drawn where a splash projectile lands. */
interface SplashRing {
  x: number;
  y: number;
  /** full radius at the end of the animation, in px */
  radiusPx: number;
  bornAt: number;
}

const SPLASH_LIFE_MS = 250;

/** One jagged radial bolt of a pulse burst. The shape is rolled once at
 * event time (plain Math.random — cosmetic only, the sim never sees it) and
 * held for the burst's lifetime so the bolt doesn't shimmer per frame. */
interface PulseBolt {
  angle: number;
  /** bolt length as a fraction of the burst radius */
  reach: number;
  /** perpendicular offsets (fractions of the radius) at intermediate joints */
  kinks: number[];
}

/** Rune-lightning burst around a pulse tower: an expanding ring out to the
 * tower's range plus a handful of jagged radial bolts (~300 ms). */
interface PulseBurst {
  x: number;
  y: number;
  /** full ring radius at the end of the animation, in px (= range × TILE_PX) */
  radiusPx: number;
  bornAt: number;
  bolts: PulseBolt[];
}

const PULSE_LIFE_MS = 300;

/** Electric blue-white for pulse lightning — deliberately far from the amber
 * splash ring so the two AoE effects never read as the same thing. */
const PULSE_RGB = "157, 184, 255"; // #9db8ff
/** Near-white core color for the bolt strokes. */
const PULSE_CORE_RGB = "234, 240, 255";

function makePulseBolts(): PulseBolt[] {
  const count = 4 + Math.floor(Math.random() * 3); // 4–6 bolts
  const baseAngle = Math.random() * Math.PI * 2;
  const bolts: PulseBolt[] = [];
  for (let i = 0; i < count; i++) {
    bolts.push({
      // Evenly fanned with jitter so bursts look organic but never clumped.
      angle: baseAngle + (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.7,
      reach: 0.55 + Math.random() * 0.4,
      kinks: [(Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.22],
    });
  }
  return bolts;
}

/** Min ms between "förstenad!" floats per enemy — re-applied slows don't spam. */
const SLOW_FLOAT_COOLDOWN_MS = 700;

/** Enemy sprite edge at scale 1; EnemyDef.scale multiplies this. */
const ENEMY_SPRITE_PX = 48;
/** Enemy hp-bar width at scale 1; follows the sprite's scale. */
const HP_BAR_PX = 36;

/** Dusk-amber accent for canvas overlays (mirrors --accent in global.css). */
const ACCENT_RGB = "240, 180, 80";
/** Stony indigo used for petrified enemies' ring + callout text. */
const PETRIFY_COLOR = "#c7d2fe";

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
  private readonly enemyDefs: Map<string, EnemyDef>;
  private readonly exitPos: Vec;
  private floats: FloatingText[] = [];
  private splashes: SplashRing[] = [];
  private pulses: PulseBurst[] = [];
  private lastSlowFloatAt = new Map<number, number>();

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
    // Display at logical size, but let CSS shrink large boards to fit the
    // viewport: `max-width: 100%` + `height: auto` (run.css) scale the bitmap
    // down with the aspect ratio preserved. Pointer→tile math must therefore
    // always use the RENDERED size (getBoundingClientRect), never TILE_PX.
    canvas.style.width = `${this.cssWidth}px`;
    canvas.style.removeProperty("height");

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;

    this.towerDefs = new Map(content.towers.map((t) => [t.id, t]));
    this.enemyDefs = new Map(content.enemies.map((e) => [e.id, e]));
    const lastWaypoint = sim.state.path[sim.state.path.length - 1];
    this.exitPos = lastWaypoint ?? { x: cols / 2, y: rows / 2 };
  }

  /** Spawn floating combat text from this tick batch's events. */
  handleEvents(events: SimEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case "enemySpawned": {
          // Boss spawn fanfare — big centered name callout with a slow fade.
          const def = this.enemyDefs.get(event.typeId);
          if (def?.boss) {
            this.addFloat(def.name, `rgb(${ACCENT_RGB})`, this.boardCenter(), { big: true });
          }
          break;
        }
        case "enemyDied": {
          this.addFloat(`+${event.bounty}`, "#fbbf24", event.at);
          this.lastSlowFloatAt.delete(event.enemyId);
          const def = this.enemyDefs.get(event.typeId);
          if (def?.boss) {
            this.addFloat(`${def.name} har fallit!`, `rgb(${ACCENT_RGB})`, this.boardCenter(), {
              big: true,
            });
          }
          break;
        }
        case "enemyLeaked":
          this.addFloat("-1 ♥", "#f87171", this.exitPos);
          this.lastSlowFloatAt.delete(event.enemyId);
          break;
        case "waveCleared":
          if (event.bonus > 0) {
            this.addFloat(`Våg klar +${event.bonus}`, "#a78bfa", {
              x: this.sim.state.grid.cols / 2,
              y: this.sim.state.grid.rows / 2,
            });
          }
          break;
        case "enemySlowed": {
          const enemy = this.sim.state.enemies.find((e) => e.id === event.enemyId);
          if (!enemy) break;
          const now = performance.now();
          const lastAt = this.lastSlowFloatAt.get(event.enemyId) ?? -Infinity;
          if (now - lastAt < SLOW_FLOAT_COOLDOWN_MS) break;
          this.lastSlowFloatAt.set(event.enemyId, now);
          this.addFloat("förstenad!", PETRIFY_COLOR, enemy.pos, { italic: true });
          break;
        }
        case "towerPulsed": {
          const tower = this.sim.state.towers.find((t) => t.id === event.towerId);
          if (!tower) break;
          this.pulses.push({
            x: (tower.tile.col + 0.5) * TILE_PX,
            y: (tower.tile.row + 0.5) * TILE_PX,
            // The event carries the effective range the sim actually hit with,
            // so the ring is always honest about the pulse's reach.
            radiusPx: event.range * TILE_PX,
            bornAt: performance.now(),
            bolts: makePulseBolts(),
          });
          break;
        }
        case "projectileHit":
          if (event.splashRadius !== undefined) {
            this.splashes.push({
              x: event.at.x * TILE_PX,
              y: event.at.y * TILE_PX,
              radiusPx: event.splashRadius * TILE_PX,
              bornAt: performance.now(),
            });
          }
          break;
        case "income": {
          const tower = this.sim.state.towers.find((t) => t.id === event.towerId);
          if (!tower) break;
          this.addFloat(`+${event.amount}g`, "#fbbf24", {
            x: tower.tile.col + 0.5,
            y: tower.tile.row + 0.3,
          });
          break;
        }
      }
    }
  }

  private boardCenter(): Vec {
    return { x: this.sim.state.grid.cols / 2, y: this.sim.state.grid.rows / 2 };
  }

  private addFloat(
    text: string,
    color: string,
    at: Vec,
    opts: { italic?: boolean; big?: boolean } = {},
  ): void {
    this.floats.push({
      text,
      color,
      x: at.x * TILE_PX,
      y: at.y * TILE_PX - 10,
      bornAt: performance.now(),
      italic: opts.italic,
      big: opts.big,
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
    this.drawSplashes();
    this.drawPulses();
    this.drawPlacementPreview();
    this.drawFloats();
    this.drawBossBanners();

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

  private towerLevelDef(typeId: string, level: number): TowerLevel | undefined {
    return this.towerDefs.get(typeId)?.levels[level - 1];
  }

  /** Range circle radius in px — 0 for non-attacking (damage 0) towers, whose
   * range is meaningless and would only mislead. */
  private towerRangePx(typeId: string, level: number): number {
    const lvl = this.towerLevelDef(typeId, level);
    if (!lvl || lvl.damage <= 0) return 0;
    return lvl.range * this.meta.rangeMult * TILE_PX;
  }

  /** Pulse towers get a slightly heavier ring — the circle IS their hit
   * area, not just a targeting radius, so it deserves a bit more presence. */
  private drawRangeCircle(
    cx: number,
    cy: number,
    radiusPx: number,
    ok = true,
    pulse = false,
  ): void {
    if (radiusPx <= 0) return;
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
    ctx.fillStyle = ok ? `rgba(${ACCENT_RGB}, 0.10)` : "rgba(248, 113, 113, 0.10)";
    ctx.fill();
    ctx.strokeStyle = ok ? `rgba(${ACCENT_RGB}, 0.45)` : "rgba(248, 113, 113, 0.45)";
    ctx.lineWidth = pulse ? 2.5 : 1.5;
    ctx.stroke();
  }

  private isPulseTower(typeId: string): boolean {
    return this.towerDefs.get(typeId)?.attackKind === "pulse";
  }

  private drawSelectedRange(): void {
    const id = this.pointer.selectedTowerId;
    if (id === null) return;
    const tower = this.sim.state.towers.find((t) => t.id === id);
    if (!tower) return;
    const cx = (tower.tile.col + 0.5) * TILE_PX;
    const cy = (tower.tile.row + 0.5) * TILE_PX;
    this.drawRangeCircle(
      cx,
      cy,
      this.towerRangePx(tower.typeId, tower.level),
      true,
      this.isPulseTower(tower.typeId),
    );

    // Highlight the selected tower's tile.
    this.ctx.strokeStyle = `rgba(${ACCENT_RGB}, 0.8)`;
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
      this.ctx.fillStyle = "#f0b450";
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
    for (const enemy of this.sim.state.enemies) {
      const x = lerp(enemy.prevPos.x, enemy.pos.x, alpha) * TILE_PX;
      const y = lerp(enemy.prevPos.y, enemy.pos.y, alpha) * TILE_PX;
      const def = this.enemyDefs.get(enemy.typeId);
      const img = this.image(def?.assetId ?? `enemy.${enemy.typeId}`);
      // def.scale (1 = normal, bosses 1.5+) scales the sprite, fallback
      // blob, hp bar width, and petrify ring alike.
      const scale = def?.scale ?? 1;
      const size = ENEMY_SPRITE_PX * scale;
      const petrified = enemy.slowTicksLeft > 0;

      if (petrified) this.drawPetrifyRing(x, y, size);

      // Petrified (sun-lantern slow): desaturate + darken the sprite so the
      // stony state reads at a glance. Reset the filter right after.
      if (petrified) ctx.filter = "grayscale(0.7) brightness(0.85)";
      if (img) {
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      } else {
        ctx.fillStyle = "#f87171";
        ctx.beginPath();
        ctx.arc(x, y, 14 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      if (petrified) ctx.filter = "none";

      this.drawHpBar(x, y - size / 2 - 7, enemy.hp / enemy.maxHp, HP_BAR_PX * scale);
    }
  }

  /** Subtle stony ground ring under enemies held by the sun-lantern's light. */
  private drawPetrifyRing(cx: number, cy: number, size: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(cx, cy + size * 0.32);
    ctx.scale(1, 0.42);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(140, 150, 190, 0.16)";
    ctx.fill();
    ctx.strokeStyle = "rgba(199, 210, 254, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  private drawHpBar(cx: number, cy: number, ratio: number, width = HP_BAR_PX, height = 5): void {
    const { ctx } = this;
    const clamped = Math.max(0, Math.min(1, ratio));
    const x = cx - width / 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(x - 1, cy - 1, width + 2, height + 2);
    // green (120) -> red (0) as hp drops
    ctx.fillStyle = `hsl(${Math.round(120 * clamped)}, 75%, 48%)`;
    ctx.fillRect(x, cy, width * clamped, height);
  }

  /** Brief expanding rings where splash projectiles landed (~250 ms each). */
  private drawSplashes(): void {
    if (this.splashes.length === 0) return;
    const { ctx } = this;
    const now = performance.now();
    this.splashes = this.splashes.filter((s) => now - s.bornAt < SPLASH_LIFE_MS);
    for (const splash of this.splashes) {
      const t = (now - splash.bornAt) / SPLASH_LIFE_MS;
      const eased = 1 - (1 - t) * (1 - t); // ease-out: fast pop, soft finish
      const radius = Math.max(2, splash.radiusPx * eased);
      ctx.beginPath();
      ctx.arc(splash.x, splash.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ACCENT_RGB}, ${0.12 * (1 - t)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${ACCENT_RGB}, ${0.7 * (1 - t)})`;
      ctx.lineWidth = 1 + 2.5 * (1 - t);
      ctx.stroke();
    }
  }

  /** Rune-lightning bursts from pulse towers (~300 ms each): an expanding
   * electric ring out to the tower's range plus jagged radial bolts. Bolts
   * are brightest in the first half and fade ahead of the ring. */
  private drawPulses(): void {
    if (this.pulses.length === 0) return;
    const { ctx } = this;
    const now = performance.now();
    this.pulses = this.pulses.filter((p) => now - p.bornAt < PULSE_LIFE_MS);
    for (const pulse of this.pulses) {
      const t = (now - pulse.bornAt) / PULSE_LIFE_MS;
      const eased = 1 - (1 - t) * (1 - t); // ease-out: fast pop, soft finish
      const fade = 1 - t;

      // Expanding ring out to the pulse's full reach.
      const radius = Math.max(2, pulse.radiusPx * eased);
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${PULSE_RGB}, ${0.10 * fade})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${PULSE_RGB}, ${0.8 * fade})`;
      ctx.lineWidth = 1.5 + 2 * fade;
      ctx.stroke();

      // Jagged radial bolts — colored glow pass, then a near-white core.
      const boltAlpha = Math.max(0, 1 - t * 1.7);
      if (boltAlpha <= 0) continue;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const bolt of pulse.bolts) {
        const len = pulse.radiusPx * bolt.reach;
        const cos = Math.cos(bolt.angle);
        const sin = Math.sin(bolt.angle);
        const joints = bolt.kinks.length + 1;
        ctx.beginPath();
        ctx.moveTo(pulse.x, pulse.y);
        bolt.kinks.forEach((kink, i) => {
          const along = (len * (i + 1)) / joints;
          const off = pulse.radiusPx * kink;
          // offset perpendicular to the bolt direction → the jagged kinks
          ctx.lineTo(pulse.x + cos * along - sin * off, pulse.y + sin * along + cos * off);
        });
        ctx.lineTo(pulse.x + cos * len, pulse.y + sin * len);
        ctx.strokeStyle = `rgba(${PULSE_RGB}, ${0.55 * boltAlpha})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${PULSE_CORE_RGB}, ${0.95 * boltAlpha})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.restore();
    }
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

    this.drawRangeCircle(
      cx,
      cy,
      this.towerRangePx(armedTowerTypeId, 1),
      ok,
      this.isPulseTower(armedTowerTypeId),
    );

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
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    this.floats = this.floats.filter(
      (f) => now - f.bornAt < (f.big ? BOSS_FLOAT_LIFE_MS : FLOAT_LIFE_MS),
    );
    for (const float of this.floats) {
      ctx.font = float.big
        ? "800 26px system-ui, sans-serif"
        : float.italic
          ? "italic 700 12px system-ui, sans-serif"
          : "700 14px system-ui, sans-serif";
      const t = (now - float.bornAt) / (float.big ? BOSS_FLOAT_LIFE_MS : FLOAT_LIFE_MS);
      const y = float.y - t * (float.big ? BOSS_FLOAT_RISE_PX : FLOAT_RISE_PX);
      ctx.globalAlpha = 1 - t * t;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
      ctx.lineWidth = float.big ? 5 : 3;
      ctx.strokeText(float.text, float.x, y);
      ctx.fillStyle = float.color;
      ctx.fillText(float.text, float.x, y);
    }
    ctx.globalAlpha = 1;
  }

  /** Top-center hp banner for every living boss (def.boss). Multiple bosses
   * stack downward; the panel mirrors the app's dark-card + amber-border UI. */
  private drawBossBanners(): void {
    const bosses = this.sim.state.enemies.filter((e) => this.enemyDefs.get(e.typeId)?.boss);
    if (bosses.length === 0) return;

    const { ctx } = this;
    const panelWidth = Math.min(380, this.cssWidth - 32);
    const panelHeight = 44;
    const gap = 8;
    const x = (this.cssWidth - panelWidth) / 2;
    let y = 10;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const boss of bosses) {
      const def = this.enemyDefs.get(boss.typeId);
      if (!def) continue;

      // Panel: dark card with the lantern-amber border used across the UI.
      ctx.beginPath();
      ctx.roundRect(x, y, panelWidth, panelHeight, 8);
      ctx.fillStyle = "rgba(12, 15, 21, 0.88)";
      ctx.fill();
      ctx.strokeStyle = `rgba(${ACCENT_RGB}, 0.65)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Boss name.
      ctx.font = "700 13px system-ui, sans-serif";
      ctx.fillStyle = `rgb(${ACCENT_RGB})`;
      ctx.fillText(def.name, this.cssWidth / 2, y + 14);

      // Wide hp bar from the live instance.
      const barWidth = panelWidth - 28;
      this.drawHpBar(this.cssWidth / 2, y + 26, boss.hp / boss.maxHp, barWidth, 7);

      y += panelHeight + gap;
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
