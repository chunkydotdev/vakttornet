/**
 * All maps — the full responsive level grid, reached from the hub's
 * "Visa alla kartor" button. Esc or Tillbaka returns to the hub.
 */
import { useEffect } from "react";
import { manifest } from "@vakttornet/assets/manifest";
import { content } from "../content";
import type { SaveData } from "../save";
import { formatSilver } from "../towerInfo";

interface LevelsScreenProps {
  save: SaveData;
  onPlay: (levelId: string) => void;
  onBack: () => void;
}

export function LevelsScreen({ save, onPlay, onBack }: LevelsScreenProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Escape") onBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <div className="screen">
      <div className="screen-inner screen-inner-wide">
        <div className="title-toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Tillbaka
          </button>
          <span className="points-chip" title="Trollsilver att spendera">
            <img className="icon" src={manifest["ui.trollsilver"]} alt="Trollsilver" />
            {formatSilver(save.points)}
          </span>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>Alla kartor</h1>
          <p className="tagline">Varje karta ger trollsilver, vinst som förlust.</p>
        </header>

        <ul className="level-list">
          {content.levels.map((level) => {
            const locked = save.totalEarned < level.unlockPoints;
            return (
              <li key={level.id} className={locked ? "level-card locked" : "level-card"}>
                <div>
                  <h3>{level.name}</h3>
                  <p className="level-meta">
                    {level.waves.length} {level.waves.length === 1 ? "våg" : "vågor"}
                    {locked && (
                      <span className="lock-note">
                        · Låst — kräver {formatSilver(level.unlockPoints)} trollsilver
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={locked}
                  onClick={() => onPlay(level.id)}
                >
                  Spela
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
