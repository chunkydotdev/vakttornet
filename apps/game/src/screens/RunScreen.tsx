/**
 * The run screen. React owns UI chrome (HUD, shop, inspector) and the sim's
 * lifecycle; the actual game runs outside React in loop.ts + render.ts.
 * HUD numbers sync through a throttled snapshot (~10/s, only on change) —
 * never per frame.
 *
 * Language: the LOCALIZED bundle (same ids/stats, display strings swapped)
 * feeds the sim, the renderer, and every lookup here. The language can only
 * change on the hub, so it is fixed for the lifetime of a run.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSim,
  type MetaModifiers,
  type PlaceResult,
  type RunStatus,
  type Sim,
  type SimEvent,
  type TowerInstance,
} from "@vakttornet/sim";
import type { ContentBundle, LevelDef, SagenDef, TowerDef } from "@vakttornet/content";
import { manifest } from "@vakttornet/assets/manifest";
import { content } from "../content";
import { useContent } from "../localized";
import { useT, type StringKey } from "../i18n";
import { mergeDeeds, silverFromScore, towerAvailable, type RunDeeds, type SaveData } from "../save";
import { newlyUnlockedSagner } from "../sagner";
import { leaderboardEnabled } from "../leaderboard";
import { startGameLoop, type GameLoop, type SimSpeed } from "../game/loop";
import { Renderer, TILE_PX, assetUrl, loadImages, type TilePos } from "../game/render";
import { playEventSounds } from "../game/sfx";
import {
  damageValue,
  dpsValue,
  formatNum,
  isEconomy,
  mechanicLines,
  mutationEffectLines,
  mutationTeaser,
  rateLabel,
  rateValue,
  roleBadge,
  upgradeLine,
} from "../towerInfo";
import { MuteButton } from "./MuteButton";
import { RunEndOverlay } from "./RunEndOverlay";

interface RunScreenProps {
  level: LevelDef;
  meta: MetaModifiers;
  save: SaveData;
  /** silverEarned is the CONVERTED trollsilver (silverFromScore), not the raw score */
  onRunEnd: (silverEarned: number, deeds: RunDeeds) => void;
  /** persist the leaderboard name after a successful submit */
  onPlayerName: (name: string) => void;
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

const PLACE_ERROR_KEY: Record<PlaceFailReason, StringKey> = {
  occupied: "errOccupied",
  "not-buildable": "errNotBuildable",
  "insufficient-gold": "errNoGold",
  "unknown-tower": "errUnknownTower",
};

const HUD_SYNC_INTERVAL_MS = 100;

/** Vårdträd = economy towers: damage 0 at their CURRENT level means the
 * tower never attacks (defs resolved from content via typeId). */
function countVardtrad(towers: readonly TowerInstance[]): number {
  let count = 0;
  for (const tower of towers) {
    const def = content.towers.find((d) => d.id === tower.typeId);
    if (def?.levels[tower.level - 1]?.damage === 0) count += 1;
  }
  return count;
}

export function RunScreen({
  level,
  meta,
  save,
  onRunEnd,
  onPlayerName,
  onExit,
  onRetry,
}: RunScreenProps) {
  const { t } = useT();
  // Localized bundle, locked in at mount like the meta modifiers — the
  // language toggle lives on the hub, so it cannot change mid-run.
  const localized = useContent();
  const bundleRef = useRef<ContentBundle>(localized);
  const bundle = bundleRef.current;

  // Meta modifiers are locked in at mount — buying upgrades mid-run (not
  // possible via UI anyway) must not retroactively change a live sim.
  const metaRef = useRef(meta);

  const simRef = useRef<Sim | null>(null);
  if (simRef.current === null) {
    simRef.current = createSim(level, bundle, {
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

  // ---- Lifetime deed tracking (sägner). Kills + petrifies accumulate from
  // the event stream; the sim's starting lives are captured here so a
  // flawless win can be detected by comparison at run end.
  const runKillsRef = useRef<Record<string, number>>({});
  const runPetrifiedRef = useRef(0);
  const startLivesRef = useRef(sim.state.lives);

  // The shop holds ONLY available towers (starters + bought in Förrådet),
  // computed ONCE at run start — locked towers never appear in a run (they
  // live in the hub's Förrådet), and silver banked when this run ends must
  // not pop new towers in mid-run.
  const [shopTowers] = useState<readonly TowerDef[]>(() =>
    bundle.towers.filter((tower) => towerAvailable(save, tower)),
  );

  const [loading, setLoading] = useState(true);
  const [hud, setHud] = useState<HudState>(() => snapshotHud(sim));
  const [armed, setArmed] = useState<string | null>(null);
  /** shop card under the mouse — drives the inspector's tower-type preview;
   * mouse-leave reverts to the armed tower (or the idle hint) */
  const [hoveredShopId, setHoveredShopId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [speed, setSpeed] = useState<SimSpeed>(1);
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);
  const [newSagner, setNewSagner] = useState<SagenDef[]>([]);
  /** vårdträd standing captured at the moment of victory (0 until won) */
  const [vardtrad, setVardtrad] = useState(0);

  const trackDeeds = useCallback((events: SimEvent[]) => {
    for (const event of events) {
      if (event.type === "enemyDied") {
        runKillsRef.current[event.typeId] = (runKillsRef.current[event.typeId] ?? 0) + 1;
      } else if (event.type === "enemySlowed") {
        runPetrifiedRef.current += 1;
      }
    }
  }, []);

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
      const renderer = new Renderer(canvas, sim, bundleRef.current, images, metaRef.current);
      rendererRef.current = renderer;
      const loop = startGameLoop({
        sim,
        onEvents: (events) => {
          trackDeeds(events);
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
  }, [sim, syncHud, trackDeeds]);

  // ---- Mirror React selection/arming state into the renderer. ----
  useEffect(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.pointer.armedTowerTypeId = armed;
      renderer.pointer.selectedTowerId = selectedId;
    }
  }, [armed, selectedId, loading]);

  // ---- Run end: bank the converted trollsilver + deeds exactly once. The
  // score stays a leaderboard figure; what's banked is silverFromScore (the
  // exchange rate lives in content.globals). Kills count won or lost; the
  // level only joins wonLevelIds (and may count as flawless) on a win. Newly
  // satisfied sägner conditions are diffed against the pre-merge save so the
  // overlay can announce them.
  const runEnded = hud.status === "won" || hud.status === "lost";
  const silverEarned = silverFromScore(sim.state.score, bundle.globals.silverPerScore);
  useEffect(() => {
    if (runEnded && !endedNotifiedRef.current) {
      endedNotifiedRef.current = true;
      const won = sim.state.status === "won";
      const deeds: RunDeeds = {
        kills: runKillsRef.current,
        petrified: runPetrifiedRef.current,
        wonLevelId: won ? level.id : null,
        flawless: won && sim.state.lives === startLivesRef.current,
      };
      setNewSagner(
        newlyUnlockedSagner(bundleRef.current.sagner, save.deeds, mergeDeeds(save.deeds, deeds)),
      );
      if (won) setVardtrad(countVardtrad(sim.state.towers));
      onRunEnd(silverFromScore(sim.state.score, content.globals.silverPerScore), deeds);
    }
  }, [runEnded, onRunEnd, sim, level.id, save.deeds]);

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
  // Large boards are CSS-scaled below their logical size to fit the viewport,
  // so tile math maps pointer coords through the RENDERED rect — never TILE_PX.
  function tileFromEvent(e: React.MouseEvent<HTMLCanvasElement>): TilePos | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const { cols, rows } = sim.state.grid;
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * cols);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * rows);
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
        setToast({ message: t(PLACE_ERROR_KEY[result.reason]), key: Date.now() });
      }
      return;
    }
    const tower = sim.state.towers.find(
      (tw) => tw.tile.col === tile.col && tw.tile.row === tile.row,
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
    selectedId === null ? null : (sim.state.towers.find((tw) => tw.id === selectedId) ?? null);
  const selectedDef = selectedTower
    ? (bundle.towers.find((tw) => tw.id === selectedTower.typeId) ?? null)
    : null;
  // Tower-type preview in the inspector: hover wins over armed, and a
  // selected placed tower (handled below) wins over both.
  const previewId = hoveredShopId ?? armed;
  const previewDef = previewId
    ? (bundle.towers.find((tw) => tw.id === previewId) ?? null)
    : null;

  const { cols, rows } = sim.state.grid;
  const canStartWave =
    !loading && hud.status === "building" && hud.waveIndex < hud.totalWaves;
  const displayWave =
    hud.status === "wave" ? hud.waveIndex : Math.min(hud.waveIndex + 1, hud.totalWaves);

  function upgradeSelected() {
    if (selectedTower && sim.upgradeTower(selectedTower.id)) syncHud();
  }

  function mutateSelected(mutationId: string) {
    // On success gold drops, so syncHud re-renders the panel into its
    // mutated state (selectedTower is re-read from sim.state each render).
    if (selectedTower && sim.mutateTower(selectedTower.id, mutationId)) syncHud();
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
          ← {t("leave")}
        </button>
        <span className="hud-title">{level.name}</span>
        <span className="hud-divider" />
        <span className="hud-stat" title={t("lives")}>
          <img className="icon" src={manifest["ui.heart"]} alt={t("lives")} />
          {hud.lives}
        </span>
        <span className="hud-stat" title={t("gold")}>
          <img className="icon" src={manifest["ui.coin"]} alt={t("gold")} />
          {hud.gold}
        </span>
        <span className="hud-stat" title={t("score")}>
          <span className="hud-label">{t("score")}</span>
          {hud.score}
        </span>
        <span className="hud-stat" title={t("wave")}>
          <span className="hud-label">{t("wave")}</span>
          {displayWave}/{hud.totalWaves}
        </span>
        <span className="hud-divider" />
        <span className="speed-toggle" role="group" aria-label={t("gameSpeedAria")}>
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
        <MuteButton />
        <button
          type="button"
          className="btn btn-primary start-wave-btn"
          disabled={!canStartWave}
          onClick={startWave}
          title={t("spacebar")}
        >
          {hud.status === "wave" ? t("waveInProgress") : t("sendWave")}
        </button>
      </header>

      <div className="run-layout">
        <aside className="side-panel">
          <h2>{t("towers")}</h2>
          {shopTowers.map((tower) => {
            const cost = tower.levels[0]?.cost ?? 0;
            return (
              <button
                key={tower.id}
                type="button"
                className={armed === tower.id ? "tower-card armed" : "tower-card"}
                onClick={() => toggleArm(tower.id)}
                onMouseEnter={() => setHoveredShopId(tower.id)}
                onMouseLeave={() =>
                  setHoveredShopId((current) => (current === tower.id ? null : current))
                }
              >
                <img src={assetUrl(tower.assetId)} alt="" />
                <span className="tower-name">{tower.name}</span>
                <span className="tower-meta">
                  <span className="role-badge">{roleBadge(tower)}</span>
                  <span className="tower-cost">
                    <img className="icon" src={manifest["ui.coin"]} alt="" />
                    {cost}
                  </span>
                </span>
              </button>
            );
          })}
          <p className="shop-hint">{t("shopHint")}</p>
        </aside>

        <div className="board-wrap">
          <canvas
            ref={canvasRef}
            width={cols * TILE_PX}
            height={rows * TILE_PX}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={handleCanvasLeave}
          />
          {loading && <div className="board-loading">{t("forestLoading")}</div>}
          {toast && (
            <div key={toast.key} className="toast">
              {toast.message}
            </div>
          )}
        </div>

        <aside className="side-panel inspector-panel">
          <h2>{t("inspect")}</h2>
          {selectedTower && selectedDef ? (
            <SelectedTowerPanel
              tower={selectedTower}
              def={selectedDef}
              gold={hud.gold}
              meta={metaRef.current}
              onUpgrade={upgradeSelected}
              onMutate={mutateSelected}
              onSell={sellSelected}
            />
          ) : previewDef ? (
            <TowerTypePanel
              def={previewDef}
              meta={metaRef.current}
              armed={armed === previewDef.id}
              onCancel={() => setArmed(null)}
            />
          ) : (
            <p className="inspector-empty">{t("inspectorEmpty")}</p>
          )}
        </aside>
      </div>

      {runEnded && (
        <RunEndOverlay
          won={hud.status === "won"}
          score={sim.state.score}
          silverEarned={silverEarned}
          newSagner={newSagner.map((s) => s.title)}
          leaderboard={
            hud.status === "won" && leaderboardEnabled()
              ? {
                  levelId: level.id,
                  vardtrad,
                  initialName: save.playerName ?? "",
                  onNameUsed: onPlayerName,
                }
              : null
          }
          onRetry={onRetry}
          onExit={onExit}
        />
      )}
    </div>
  );
}

interface TowerTypePanelProps {
  def: TowerDef;
  meta: MetaModifiers;
  /** true when this tower type is the one currently armed for placement */
  armed: boolean;
  onCancel: () => void;
}

/** Tower-type details (level 1 + upgrade path) shown while the player hovers
 * a shop card or has one armed — before anything is bought. All stat lines
 * are derived from content data via towerInfo; meta modifiers apply to
 * damage/range exactly like the placed-tower inspector. */
function TowerTypePanel({ def, meta, armed, onCancel }: TowerTypePanelProps) {
  const { t } = useT();
  const l1 = def.levels[0];
  if (!l1) return null;
  const economy = isEconomy(l1);

  return (
    <>
      <div className="inspector-tower-head">
        <img src={assetUrl(def.assetId)} alt="" />
        <div>
          <div className="tower-name">
            {def.name} <span className="role-badge">{roleBadge(def)}</span>
          </div>
          <div className="tower-level">
            {armed ? t("placing") : t("costsG", { n: l1.cost })}
          </div>
        </div>
      </div>

      <p className="tower-flavor">{def.description}</p>

      {!economy && (
        <div className="stat-table">
          <div className="stat-row">
            <span className="stat-label">{t("statDamage")}</span>
            <span className="stat-value">{damageValue(def, l1, meta.damageMult)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">{rateLabel(def)}</span>
            <span className="stat-value">{rateValue(def, l1)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">{t("statDps")}</span>
            <span className="stat-value">{dpsValue(def, l1, meta.damageMult)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">{t("statRange")}</span>
            <span className="stat-value">
              {t("tilesUnit", { n: formatNum(l1.range * meta.rangeMult) })}
            </span>
          </div>
        </div>
      )}

      {mechanicLines(def, l1).map((line) => (
        <p key={line} className="mechanic-line">
          {line}
        </p>
      ))}

      {def.levels.length > 1 && (
        <div className="upgrade-path">
          {def.levels.map((_, index) => {
            const line = upgradeLine(def, index, meta);
            return line === null ? null : <p key={line}>{line}</p>;
          })}
        </div>
      )}

      {mutationTeaser(def) && <p className="mutation-teaser">⟡ {mutationTeaser(def)}</p>}

      {armed && (
        <button type="button" className="btn btn-small" onClick={onCancel}>
          {t("cancelEsc")}
        </button>
      )}
    </>
  );
}

interface SelectedTowerPanelProps {
  tower: TowerInstance;
  def: TowerDef;
  gold: number;
  meta: MetaModifiers;
  onUpgrade: () => void;
  onMutate: (mutationId: string) => void;
  onSell: () => void;
}

function SelectedTowerPanel({
  tower,
  def,
  gold,
  meta,
  onUpgrade,
  onMutate,
  onSell,
}: SelectedTowerPanelProps) {
  const { t } = useT();
  const current = def.levels[tower.level - 1];
  const next = def.levels[tower.level];
  if (!current) return null;

  // Mutation flow (utvecklingar): at max level a tower with mutation data
  // offers exactly two branches; once one is bought the choice is final and
  // all upgrade UI disappears. Everything is derived from def + instance
  // data — no mutation ids are special-cased.
  const chosenMutation = tower.mutationId
    ? (def.mutations?.find((m) => m.id === tower.mutationId) ?? null)
    : null;
  const offersMutations =
    next === undefined && chosenMutation === null && (def.mutations?.length ?? 0) > 0;

  // Mutation cost counts toward the sell refund (sim contract).
  const spent =
    def.levels.slice(0, tower.level).reduce((sum, l) => sum + l.cost, 0) +
    (chosenMutation?.cost ?? 0);
  const refund = Math.floor(spent * content.globals.sellRefundRatio);
  // Economy towers (damage 0) never attack — combat stats (including range)
  // are meaningless, so show their income instead.
  const economy = isEconomy(current);
  const range = formatNum(current.range * meta.rangeMult);

  return (
    <>
      <div className="inspector-tower-head">
        <img src={assetUrl(def.assetId)} alt="" />
        <div>
          <div className="tower-name">{def.name}</div>
          <div className="tower-level">
            {t("levelOf", { l: tower.level, m: def.levels.length })}
          </div>
          {chosenMutation && <div className="mutation-subtitle">⟡ {chosenMutation.name}</div>}
        </div>
      </div>

      <div className="stat-table">
        {economy ? (
          <div className="stat-row">
            <span className="stat-label">{t("statIncome")}</span>
            <span className="stat-value">
              {t("incomePerWave", { n: current.incomePerWave ?? 0 })}
            </span>
          </div>
        ) : (
          <>
            <div className="stat-row">
              <span className="stat-label">{t("statDamage")}</span>
              <span className="stat-value">{damageValue(def, current, meta.damageMult)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">{t("statRange")}</span>
              <span className="stat-value">{t("tilesUnit", { n: range })}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">{rateLabel(def)}</span>
              <span className="stat-value">{rateValue(def, current)}</span>
            </div>
          </>
        )}
      </div>

      {chosenMutation &&
        mutationEffectLines(chosenMutation.effect).map((line) => (
          <p key={line} className="mechanic-line">
            {line}
          </p>
        ))}

      <div className="inspector-actions">
        {next ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={gold < next.cost}
              onClick={onUpgrade}
            >
              {t("upgradeBtn", { n: next.cost })}
            </button>
            <p className="next-level-note">
              {next.damage === 0
                ? t("nextLevelIncome", { n: next.incomePerWave ?? 0 })
                : t("nextLevelStats", {
                    d: formatNum(next.damage * meta.damageMult),
                    r: formatNum(next.range * meta.rangeMult),
                    rate: rateValue(def, next),
                  })}
            </p>
          </>
        ) : offersMutations ? (
          <div className="mutation-choice">
            <p className="mutation-choice-title">{t("chooseMutation")}</p>
            {def.mutations!.map((mutation) => {
              const affordable = gold >= mutation.cost;
              return (
                <button
                  key={mutation.id}
                  type="button"
                  className="mutation-card"
                  disabled={!affordable}
                  onClick={() => onMutate(mutation.id)}
                >
                  <span className="mutation-name">⟡ {mutation.name}</span>
                  <span className="mutation-desc">{mutation.description}</span>
                  {mutationEffectLines(mutation.effect).map((line) => (
                    <span key={line} className="mutation-effect">
                      {line}
                    </span>
                  ))}
                  <span className={affordable ? "mutation-cost" : "mutation-cost insufficient"}>
                    {mutation.cost}g
                  </span>
                </button>
              );
            })}
          </div>
        ) : chosenMutation ? null : (
          <button type="button" className="btn" disabled>
            {t("maxLevel")}
          </button>
        )}
        <button type="button" className="btn btn-danger" onClick={onSell}>
          {t("sellBtn", { n: refund })}
        </button>
      </div>
    </>
  );
}
