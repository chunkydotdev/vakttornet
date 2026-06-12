import { manifest } from "@vakttornet/assets/manifest";
import { content } from "../content";
import { leaderboardEnabled } from "../leaderboard";
import type { SaveData } from "../save";

interface TitleScreenProps {
  save: SaveData;
  onPlay: (levelId: string) => void;
  onUpgrades: () => void;
  onCodex: () => void;
  onTopplista: () => void;
}

export function TitleScreen({ save, onPlay, onUpgrades, onCodex, onTopplista }: TitleScreenProps) {
  return (
    <div className="screen">
      {/* Wider inner so the level grid fits two columns of readable cards. */}
      <div className="screen-inner screen-inner-wide">
        <header className="title-header">
          <h1>Vakttornet</h1>
          <p className="tagline">Mörka skogen vaknar. Håll stigen — försvara stugan.</p>
        </header>

        <div className="title-toolbar">
          <span className="points-chip" title="Poäng att spendera">
            <img className="icon" src={manifest["ui.coin"]} alt="" />
            {save.points} poäng
          </span>
          <span className="title-toolbar-actions">
            <button type="button" className="btn" onClick={onUpgrades}>
              Uppgraderingar
            </button>
            <button type="button" className="btn" onClick={onCodex}>
              Sägner
            </button>
            {leaderboardEnabled() && (
              <button type="button" className="btn" onClick={onTopplista}>
                Topplista
              </button>
            )}
          </span>
        </div>

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
                        · Låst — kräver {level.unlockPoints} poäng
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

        <p className="muted" style={{ textAlign: "center", fontSize: "0.8rem" }}>
          Du samlar poäng varje gång du spelar — vinst som förlust.
        </p>
      </div>
    </div>
  );
}
