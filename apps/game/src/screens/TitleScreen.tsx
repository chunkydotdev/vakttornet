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
          <p className="tagline">Mörka skogen vaknar. Håll stigen — försvara stugan.</p>
        </header>

        <div className="title-toolbar">
          <span className="points-chip" title="Poäng att spendera">
            <img className="icon" src={manifest["ui.coin"]} alt="" />
            {save.points} poäng
          </span>
          <button type="button" className="btn" onClick={onUpgrades}>
            Uppgraderingar
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
