/**
 * The run screen. React owns UI chrome (HUD, shop, inspector) and the sim's
 * lifecycle; the actual game runs outside React in loop.ts + render.ts.
 * HUD numbers sync through a throttled snapshot (~10/s, only on change) —
 * never per frame.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSim,
  TICK_RATE,
  type MetaModifiers,
  type PlaceResult,
  type RunStatus,
  type Sim,
  type TowerInstance,
} from "@vakttornet/sim";
import type { LevelDef, TowerDef } from "@vakttornet/content";
import { manifest } from "@vakttornet/assets/manifest";
import { content } from "../content";
import { startGameLoop, type GameLoop, type SimSpeed } from "../game/loop";
import { Renderer, TILE_PX, assetUrl, loadImages, type TilePos } from "../game/render";
import { playEventSounds } from "../game/sfx";
import { RunEndOverlay } from "./RunEndOverlay";

interface RunScreenProps {
  level: LevelDef;
  meta: MetaModifiers;
  onRunEnd: (score: number) => void;
  onExit: () => void;
  onRetry: () => void;
}

interface HudState {
  status: RunStatus;
  lives: number;
  gold: number;
  score: number;
  waveIndex: number;
  totalWaves: number;
}

function snapshotHud(sim: Sim): HudState {
  const s = sim.state;
  return {
    status: s.status,
    lives: s.lives,
    gold: s.gold,
    score: s.score,
    waveIndex: s.waveIndex,
    totalWaves: s.totalWaves,
  };
}

function hudEqual(a: HudState, b: HudState): boolean {
  return (
    a.status === b.status &&
    a.lives === b.lives &&
    a.gold === b.gold &&
    a.score === b.score &&
    a.waveIndex === b.waveIndex &&
    a.totalWaves === b.totalWaves
  );
}

type PlaceFailReason = Extract<PlaceResult, { ok: false }>["reason"];

const PLACE_ERROR_TEXT: Record<PlaceFailReason, string> = {
  occupied: "Det står redan ett torn där",
  "not-buildable": "Här kan du inte bygga",
  "insufficient-gold": "För lite guld",
  "unknown-tower": "Okänd torntyp",
};

const HUD_SYNC_INTERVAL_MS = 100;

export function RunScreen({ level, meta, onRunEnd, onExit, onRetry }: RunScreenProps) {
  // Meta modifiers are locked in at mount — buying upgrades mid-run (not
  // possible via UI anyway) must not retroactively change a live sim.
  const metaRef = useRef(meta);

  const simRef = useRef<Sim | null>(null);
  if (simRef.current === null) {
    simRef.current = createSim(level, content, {
      seed: Math.floor(Math.random() * 0x7fffffff),
      meta: metaRef.current,
    });
  }
  const sim = simRef.current;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const speedRef = useRef<SimSpeed>(1);
  const endedNotifiedRef = useRef(false);
  const lastHudSyncRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [hud, setHud] = useState<HudState>(() => snapshotHud(sim));
  const [armed, setArmed] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [speed, setSpeed] = useState<SimSpeed>(1);
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);

  const syncHud = useCallback(() => {
    const next = snapshotHud(sim);
    setHud((prev) => (hudEqual(prev, next) ? prev : next));
  }, [sim]);

  // ---- Boot: preload sprites, build renderer, start the rAF loop. ----
  useEffect(() => {
    let cancelled = false;
    loadImages().then((images) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const renderer = new Renderer(canvas, sim, content, images, metaRef.current);
      rendererRef.current = renderer;
      const loop = startGameLoop({
        sim,
        onEvents: (events) => {
          renderer.handleEvents(events);
          playEventSounds(events);
        },
        onTicked: () => {
          const now = performance.now();
          const status = sim.state.status;
          const terminal = status === "won" || status === "lost";
          if (terminal || now - lastHudSyncRef.current >= HUD_SYNC_INTERVAL_MS) {
            lastHudSyncRef.current = now;
            syncHud();
          }
        },
        render: (alpha) => renderer.draw(alpha),
      });
      loop.setSpeed(speedRef.current);
      loopRef.current = loop;
      setLoading(false);
    });
    return () => {
      cancelled = true;
      loopRef.current?.stop();
      loopRef.current = null;
      rendererRef.current = null;
    };
  }, [sim, syncHud]);

  // ---- Mirror React selection/arming state into the renderer. ----
  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.pointer.armedTowerTypeId = armed;
      renderer.pointer.selectedTowerId = selectedId;
    }
  }, [armed, selectedId, loading]);

  // ---- Run end: bank the score exactly once. ----
  const runEnded = hud.status === "won" || hud.status === "lost";
  useEffect(() => {
    if (runEnded && !endedNotifiedRef.current) {
      endedNotifiedRef.current = true;
      onRunEnd(sim.state.score);
    }
  }, [runEnded, onRunEnd, sim]);

  const startWave = useCallback(() => {
    if (sim.startWave()) {
      lastHudSyncRef.current = performance.now();
      syncHud();
    }
  }, [sim, syncHud]);

  // ---- Keyboard: Escape cancels, Space starts the next wave. ----
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Escape") {
        setArmed(null);
        setSelectedId(null);
      } else if (e.code === "Space") {
        e.preventDefault();
        startWave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startWave]);

  // ---- Toast auto-dismiss. ----
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ---- Canvas input. ----
  function tileFromEvent(e: React.MouseEvent<HTMLCanvasElement>): TilePos | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / TILE_PX);
    const row = Math.floor((e.clientY - rect.top) / TILE_PX);
    const { cols, rows } = sim.state.grid;
    if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
    return { col, row };
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const renderer = rendererRef.current;
    if (renderer) renderer.pointer.hoverTile = tileFromEvent(e);
  }

  function handleCanvasLeave() {
    const renderer = rendererRef.current;
    if (renderer) renderer.pointer.hoverTile = null;
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const tile = tileFromEvent(e);
    if (!tile) return;
    if (armed) {
      const result = sim.placeTower(armed, tile);
      if (result.ok) {
        // Stay armed for rapid building; Escape or re-click cancels.
        syncHud();
      } else {
        setToast({ message: PLACE_ERROR_TEXT[result.reason], key: Date.now() });
      }
      return;
    }
    const tower = sim.state.towers.find(
      (t) => t.tile.col === tile.col && t.tile.row === tile.row,
    );
    setSelectedId(tower ? tower.id : null);
  }

  function toggleArm(typeId: string) {
    setSelectedId(null);
    setArmed((current) => (current === typeId ? null : typeId));
  }

  function changeSpeed(next: SimSpeed) {
    speedRef.current = next;
    setSpeed(next);
    loopRef.current?.setSpeed(next);
  }

  // ---- Derived state for panels. ----
  const selectedTower =
    selectedId === null ? null : (sim.state.towers.find((t) => t.id === selectedId) ?? null);
  const selectedDef = selectedTower
    ? (content.towers.find((t) => t.id === selectedTower.typeId) ?? null)
    : null;
  const armedDef = armed ? (content.towers.find((t) => t.id === armed) ?? null) : null;

  const { cols, rows } = sim.state.grid;
  const canStartWave =
    !loading && hud.status === "building" && hud.waveIndex < hud.totalWaves;
  const displayWave =
    hud.status === "wave" ? hud.waveIndex : Math.min(hud.waveIndex + 1, hud.totalWaves);

  function upgradeSelected() {
    if (selectedTower && sim.upgradeTower(selectedTower.id)) syncHud();
  }

  function sellSelected() {
    if (selectedTower && sim.sellTower(selectedTower.id)) {
      setSelectedId(null);
      syncHud();
    }
  }

  return (
    <div className="run-screen">
      <header className="hud">
        <button type="button" className="btn btn-ghost btn-small" onClick={onExit}>
          ← Lämna
        </button>
        <span className="hud-title">{level.name}</span>
        <span className="hud-divider" />
        <span className="hud-stat" title="Liv">
          <img className="icon" src={manifest["ui.heart"]} alt="Liv" />
          {hud.lives}
        </span>
        <span className="hud-stat" title="Guld">
          <img className="icon" src={manifest["ui.coin"]} alt="Guld" />
          {hud.gold}
        </span>
        <span className="hud-stat" title="Poäng">
          <span className="hud-label">Poäng</span>
          {hud.score}
        </span>
        <span className="hud-stat" title="Våg">
          <span className="hud-label">Våg</span>
          {displayWave}/{hud.totalWaves}
        </span>
        <span className="hud-divider" />
        <span className="speed-toggle" role="group" aria-label="Spelhastighet">
          <button
            type="button"
            className={speed === 1 ? "active" : undefined}
            onClick={() => changeSpeed(1)}
          >
            1×
          </button>
          <button
            type="button"
            className={speed === 2 ? "active" : undefined}
            onClick={() => changeSpeed(2)}
          >
            2×
          </button>
        </span>
        <button
          type="button"
          className="btn btn-primary start-wave-btn"
          disabled={!canStartWave}
          onClick={startWave}
          title="Mellanslag"
        >
          {hud.status === "wave" ? "Våg pågår…" : "Skicka våg"}
        </button>
      </header>

      <div className="run-layout">
        <aside className="side-panel">
          <h2>Torn</h2>
          {content.towers.map((tower) => {
            const cost = tower.levels[0]?.cost ?? 0;
            return (
              <button
                key={tower.id}
                type="button"
                className={armed === tower.id ? "tower-card armed" : "tower-card"}
                onClick={() => toggleArm(tower.id)}
                title={tower.description}
              >
                <img src={assetUrl(tower.assetId)} alt="" />
                <span>
                  <span className="tower-name">{tower.name}</span>
                  <span className="tower-cost">
                    <img className="icon" src={manifest["ui.coin"]} alt="" />
                    {cost}
                  </span>
                </span>
              </button>
            );
          })}
          <p className="shop-hint">
            Välj ett torn och klicka sedan på en grön ruta för att bygga. Esc avbryter.
          </p>
        </aside>

        <div className="board-wrap">
          <canvas
            ref={canvasRef}
            width={cols * TILE_PX}
            height={rows * TILE_PX}
            style={{ width: cols * TILE_PX, height: rows * TILE_PX }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={handleCanvasLeave}
          />
          {loading && <div className="board-loading">Mörka skogen vaknar…</div>}
          {toast && (
            <div key={toast.key} className="toast">
              {toast.message}
            </div>
          )}
        </div>

        <aside className="side-panel">
          <h2>Granska</h2>
          {selectedTower && selectedDef ? (
            <SelectedTowerPanel
              tower={selectedTower}
              def={selectedDef}
              gold={hud.gold}
              meta={metaRef.current}
              onUpgrade={upgradeSelected}
              onSell={sellSelected}
            />
          ) : armedDef ? (
            <>
              <div className="inspector-tower-head">
                <img src={assetUrl(armedDef.assetId)} alt="" />
                <div>
                  <div className="tower-name">{armedDef.name}</div>
                  <div className="tower-level">Placerar…</div>
                </div>
              </div>
              <p className="inspector-empty">{armedDef.description}</p>
              <button type="button" className="btn btn-small" onClick={() => setArmed(null)}>
                Avbryt (Esc)
              </button>
            </>
          ) : (
            <p className="inspector-empty">
              Klicka på ett torn på spelplanen för att granska, uppgradera eller sälja det.
              Tryck på mellanslag för att skicka nästa våg.
            </p>
          )}
        </aside>
      </div>

      {runEnded && (
        <RunEndOverlay
          won={hud.status === "won"}
          score={sim.state.score}
          onRetry={onRetry}
          onExit={onExit}
        />
      )}
    </div>
  );
}

interface SelectedTowerPanelProps {
  tower: TowerInstance;
  def: TowerDef;
  gold: number;
  meta: MetaModifiers;
  onUpgrade: () => void;
  onSell: () => void;
}

function SelectedTowerPanel({ tower, def, gold, meta, onUpgrade, onSell }: SelectedTowerPanelProps) {
  const current = def.levels[tower.level - 1];
  const next = def.levels[tower.level];
  if (!current) return null;

  const spent = def.levels.slice(0, tower.level).reduce((sum, l) => sum + l.cost, 0);
  const refund = Math.floor(spent * content.globals.sellRefundRatio);
  const damage = formatNumber(current.damage * meta.damageMult);
  const range = formatNumber(current.range * meta.rangeMult);
  const rate = formatNumber(TICK_RATE / current.cooldownTicks);

  return (
    <>
      <div className="inspector-tower-head">
        <img src={assetUrl(def.assetId)} alt="" />
        <div>
          <div className="tower-name">{def.name}</div>
          <div className="tower-level">
            Nivå {tower.level}/{def.levels.length}
          </div>
        </div>
      </div>

      <div className="stat-table">
        <div className="stat-row">
          <span className="stat-label">Skada</span>
          <span className="stat-value">{damage}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Räckvidd</span>
          <span className="stat-value">{range} rutor</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Eldtakt</span>
          <span className="stat-value">{rate}/s</span>
        </div>
      </div>

      <div className="inspector-actions">
        {next ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={gold < next.cost}
              onClick={onUpgrade}
            >
              Uppgradera — {next.cost}g
            </button>
            <p className="next-level-note">
              Nästa nivå: {formatNumber(next.damage * meta.damageMult)} skada,{" "}
              {formatNumber(next.range * meta.rangeMult)} räckvidd,{" "}
              {formatNumber(TICK_RATE / next.cooldownTicks)}/s
            </p>
          </>
        ) : (
          <button type="button" className="btn" disabled>
            Maxnivå
          </button>
        )}
        <button type="button" className="btn btn-danger" onClick={onSell}>
          Sälj — +{refund}g
        </button>
      </div>
    </>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
