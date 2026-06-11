import { manifest } from "@vakttornet/assets/manifest";
import { content } from "../content";
import type { SaveData } from "../save";

interface TitleScreenProps {
  save: SaveData;
  onPlay: (levelId: string) => void;
  onUpgrades: () => void;
}

export function TitleScreen({ save, onPlay, onUpgrades }: TitleScreenProps) {
  return (
    <div className="screen">
      <div className="screen-inner">
        <header className="title-header">
          <h1>Vakttornet</h1>
          <p className="tagline">Försvara stigen! Build towers, hold the line.</p>
        </header>

        <div className="title-toolbar">
          <span className="points-chip" title="Spendable meta points">
            <img className="icon" src={manifest["ui.coin"]} alt="" />
            {save.points} points
          </span>
          <button type="button" className="btn" onClick={onUpgrades}>
            Upgrades
          </button>
        </div>

        <ul className="level-list">
          {content.levels.map((level) => {
            const locked = save.totalEarned < level.unlockPoints;
            return (
              <li key={level.id} className={locked ? "level-card locked" : "level-card"}>
                <div>
                  <h3>{level.name}</h3>
                  <p className="level-meta">
                    {level.waves.length} waves
                    {locked && (
                      <span className="lock-note">
                        · Locked — needs {level.unlockPoints} points
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
                  Play
                </button>
              </li>
            );
          })}
        </ul>

        <p className="muted" style={{ textAlign: "center", fontSize: "0.8rem" }}>
          Earn points by playing — win or lose, your score carries over.
        </p>
      </div>
    </div>
  );
}
