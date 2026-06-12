/**
 * All maps — the full responsive level grid, reached from the hub's
 * "Visa alla kartor" button. Esc or Tillbaka returns to the hub.
 */
import { useEffect } from "react";
import { manifest } from "@vakttornet/assets/manifest";
import { useContent } from "../localized";
import { useT } from "../i18n";
import type { SaveData } from "../save";
import { formatSilver } from "../towerInfo";

interface LevelsScreenProps {
  save: SaveData;
  onPlay: (levelId: string) => void;
  onBack: () => void;
}

export function LevelsScreen({ save, onPlay, onBack }: LevelsScreenProps) {
  const { t } = useT();
  const content = useContent();

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
            ← {t("back")}
          </button>
          <span className="points-chip" title={t("silverToSpend")}>
            <img className="icon" src={manifest["ui.trollsilver"]} alt={t("trollsilver")} />
            {formatSilver(save.points)}
          </span>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>{t("allMaps")}</h1>
          <p className="tagline">{t("allMapsTagline")}</p>
        </header>

        <ul className="level-list">
          {content.levels.map((level) => {
            const locked = save.totalEarned < level.unlockPoints;
            return (
              <li key={level.id} className={locked ? "level-card locked" : "level-card"}>
                <div>
                  <h3>{level.name}</h3>
                  <p className="level-meta">
                    {t(level.waves.length === 1 ? "waveCountOne" : "waveCountMany", {
                      n: level.waves.length,
                    })}
                    {locked && (
                      <span className="lock-note">
                        · {t("lockedNeeds", { s: formatSilver(level.unlockPoints) })}
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
                  {t("play")}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
