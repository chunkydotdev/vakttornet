/**
 * Sägner codex — folklore tales collected by playing. Unlocked entries show
 * their full text in an old-tale serif style; locked ones show a "???"
 * silhouette plus a subtle hint derived from the unlock condition.
 */
import { useContent } from "../localized";
import { useT } from "../i18n";
import type { SaveData } from "../save";
import { isSagenUnlocked, sagenHint } from "../sagner";

interface CodexScreenProps {
  save: SaveData;
  onBack: () => void;
}

export function CodexScreen({ save, onBack }: CodexScreenProps) {
  const { t } = useT();
  const content = useContent();
  const unlockedCount = content.sagner.filter((s) =>
    isSagenUnlocked(s.condition, save.deeds),
  ).length;

  return (
    <div className="screen">
      <div className="screen-inner">
        <div className="title-toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← {t("back")}
          </button>
          <span className="points-chip" title={t("codexDiscoveredTitle")}>
            {t("codexCount", { n: unlockedCount, m: content.sagner.length })}
          </span>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>{t("sagner")}</h1>
          <p className="tagline">{t("codexTagline")}</p>
        </header>

        <ul className="sagen-list">
          {content.sagner.map((sagen) => {
            const unlocked = isSagenUnlocked(sagen.condition, save.deeds);
            return unlocked ? (
              <li key={sagen.id} className="sagen-card">
                <h3 className="sagen-title">{sagen.title}</h3>
                <p className="sagen-text">{sagen.text}</p>
              </li>
            ) : (
              <li key={sagen.id} className="sagen-card locked">
                <h3 className="sagen-title">???</h3>
                <p className="sagen-hint">{sagenHint(sagen.condition, content)}</p>
              </li>
            );
          })}
        </ul>

        {content.sagner.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>
            {t("codexEmpty")}
          </p>
        )}
      </div>
    </div>
  );
}
