/**
 * Compact SV | EN switch, shown next to the mute button on the hub. The
 * choice persists (localStorage) and swaps every screen instantly via the
 * language context.
 */
import { useT } from "../i18n";

export function LangToggle() {
  const { t, lang, setLang } = useT();

  return (
    <span className="lang-toggle" role="group" aria-label={t("languageAria")}>
      <button
        type="button"
        className={lang === "sv" ? "active" : undefined}
        aria-pressed={lang === "sv"}
        aria-label={t("langSwedish")}
        onClick={() => setLang("sv")}
      >
        SV
      </button>
      <button
        type="button"
        className={lang === "en" ? "active" : undefined}
        aria-pressed={lang === "en"}
        aria-label={t("langEnglish")}
        onClick={() => setLang("en")}
      >
        EN
      </button>
    </span>
  );
}
