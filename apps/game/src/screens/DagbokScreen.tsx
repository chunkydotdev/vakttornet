/**
 * Tornets dagbok — an in-world changelog. Reuses the codex's old-tale card
 * look so it feels native; entries come from the localized dagbok data (newest
 * first), with the most recent one given a subtle "latest" flourish.
 */
import { useEffect } from "react";
import { useT } from "../i18n";
import { dagbokEntries, markDagbokSeen } from "../dagbok";

interface DagbokScreenProps {
  onBack: () => void;
}

export function DagbokScreen({ onBack }: DagbokScreenProps) {
  const { t, lang } = useT();
  const entries = dagbokEntries(lang);

  // Opening the diary counts as seeing it: clear the attention dot for next
  // time the hub renders (the hub remounts on return and re-reads storage).
  useEffect(() => {
    markDagbokSeen();
  }, []);

  return (
    <div className="screen">
      <div className="screen-inner">
        <div className="title-toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← {t("back")}
          </button>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>{t("dagbok")}</h1>
          <p className="tagline">{t("dagbokTagline")}</p>
        </header>

        <ul className="dagbok-list">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className={i === 0 ? "dagbok-card latest" : "dagbok-card"}
            >
              <span className="dagbok-when">{entry.when}</span>
              <h3 className="dagbok-title">{entry.title}</h3>
              <p className="dagbok-body">{entry.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
