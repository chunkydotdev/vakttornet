/**
 * Sägner codex — folklore tales collected by playing. Unlocked entries show
 * their full text in an old-tale serif style; locked ones show a "???"
 * silhouette plus a subtle hint derived from the unlock condition.
 */
import { content } from "../content";
import type { SaveData } from "../save";
import { isSagenUnlocked, sagenHint } from "../sagner";

interface CodexScreenProps {
  save: SaveData;
  onBack: () => void;
}

export function CodexScreen({ save, onBack }: CodexScreenProps) {
  const unlockedCount = content.sagner.filter((s) =>
    isSagenUnlocked(s.condition, save.deeds),
  ).length;

  return (
    <div className="screen">
      <div className="screen-inner">
        <div className="title-toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Tillbaka
          </button>
          <span className="points-chip" title="Upptäckta sägner">
            {unlockedCount} av {content.sagner.length} sägner upptäckta
          </span>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>Sägner</h1>
          <p className="tagline">Skogens berättelser, samlade vid lyktans sken.</p>
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
            Skogen har inga sägner att berätta än.
          </p>
        )}
      </div>
    </div>
  );
}
