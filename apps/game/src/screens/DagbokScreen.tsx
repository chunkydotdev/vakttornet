/**
 * Tornets dagbok — an in-world changelog. Reuses the codex's old-tale card
 * look so it feels native; entries come from the localized dagbok data (newest
 * first), with the most recent one given a subtle "latest" flourish.
 */
import { useT } from "../i18n";
import { dagbokEntries } from "../dagbok";

interface DagbokScreenProps {
  onBack: () => void;
}

export function DagbokScreen({ onBack }: DagbokScreenProps) {
  const { t, lang } = useT();
  const entries = dagbokEntries(lang);

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
              key={entry.title}
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
