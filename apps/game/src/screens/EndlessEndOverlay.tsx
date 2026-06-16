/**
 * Endless run-end overlay. No win state — the night always takes you. Shows
 * how many waves you held and how many vårdträd were still standing (the
 * leaderboard tiebreak, wired in increment 2). Same card chrome as the
 * campaign RunEndOverlay so it feels native.
 */
import { manifest } from "@vakttornet/assets/manifest";
import { useT } from "../i18n";

interface EndlessEndOverlayProps {
  wavesSurvived: number;
  vardtrad: number;
  onRetry: () => void;
  onExit: () => void;
}

export function EndlessEndOverlay({
  wavesSurvived,
  vardtrad,
  onRetry,
  onExit,
}: EndlessEndOverlayProps) {
  const { t } = useT();
  return (
    <div className="run-end-overlay" role="dialog" aria-modal="true">
      <div className="run-end-card">
        <h2 className="lost">{t("endlessOverTitle")}</h2>
        <p className="run-end-sub">{t("endlessOverSub")}</p>
        <p className="run-end-score">
          <span className="label">{t("endlessWavesLabel")}</span>
          {wavesSurvived}
        </p>
        <span className="endless-vardtrad">
          <img className="icon" src={manifest["tower.vardtradet"]} alt="" />
          {t("endlessVardtradStanding", { n: vardtrad })}
        </span>
        <div className="run-end-actions">
          <button type="button" className="btn" onClick={onExit}>
            {t("toMaps")}
          </button>
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            {t("playAgain")}
          </button>
        </div>
      </div>
    </div>
  );
}
