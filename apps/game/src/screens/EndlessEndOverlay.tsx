/**
 * Endless run-end overlay. No win state — the night always takes you. Shows
 * how many waves you held and how many vårdträd were still standing (the
 * leaderboard tiebreak), and — when the board is configured — lets you submit
 * to the global "Evig vakt" survival ladder. Same card chrome as the campaign
 * RunEndOverlay so it feels native.
 */
import { useState, type FormEvent } from "react";
import { NAME_PATTERN } from "@vakttornet/leaderboard/api";
import { manifest } from "@vakttornet/assets/manifest";
import { LeaderboardError, submitScore } from "../leaderboard";
import { useT, type StringKey } from "../i18n";
import { ENDLESS_LEVEL_ID } from "../endless";

export interface EndlessLeaderboard {
  /** prefill from the save's last-used name */
  initialName: string;
  /** called with the trimmed name after a successful submit, to persist it */
  onNameUsed: (name: string) => void;
}

interface EndlessEndOverlayProps {
  wavesSurvived: number;
  vardtrad: number;
  /** present only when the leaderboard is configured */
  leaderboard: EndlessLeaderboard | null;
  onRetry: () => void;
  onExit: () => void;
}

export function EndlessEndOverlay({
  wavesSurvived,
  vardtrad,
  leaderboard,
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
        {leaderboard && (
          <EndlessSubmitPanel
            wavesSurvived={wavesSurvived}
            vardtrad={vardtrad}
            board={leaderboard}
          />
        )}
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

type SubmitPhase =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; rank: number }
  | { kind: "error"; message: string };

function submitErrorKey(err: unknown): StringKey {
  if (err instanceof LeaderboardError && err.code === "rate-limited") {
    return "rateLimited";
  }
  return "boardError";
}

function EndlessSubmitPanel({
  wavesSurvived,
  vardtrad,
  board,
}: {
  wavesSurvived: number;
  vardtrad: number;
  board: EndlessLeaderboard;
}) {
  const { t } = useT();
  const [name, setName] = useState(board.initialName);
  const [phase, setPhase] = useState<SubmitPhase>({ kind: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase.kind === "sending" || phase.kind === "done") return;
    const trimmed = name.trim();
    if (!NAME_PATTERN.test(trimmed)) {
      setPhase({ kind: "error", message: t("nameError") });
      return;
    }
    setPhase({ kind: "sending" });
    try {
      // Field reuse: on the endless board `score` = waves, `vardtrad` = trees.
      const res = await submitScore({
        levelId: ENDLESS_LEVEL_ID,
        name: trimmed,
        vardtrad,
        score: wavesSurvived,
      });
      board.onNameUsed(trimmed);
      setPhase({ kind: "done", rank: res.rank });
    } catch (err) {
      setPhase({ kind: "error", message: t(submitErrorKey(err)) });
    }
  }

  return (
    <div className="run-end-leaderboard">
      {phase.kind === "done" ? (
        <p className="lb-success">{t("rankResult", { n: phase.rank })}</p>
      ) : (
        <form className="lb-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            maxLength={12}
            placeholder={t("namePlaceholder")}
            aria-label={t("namePlaceholder")}
            disabled={phase.kind === "sending"}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={phase.kind === "sending"}>
            {phase.kind === "sending" ? t("sending") : t("submitToBoard")}
          </button>
        </form>
      )}
      {phase.kind === "error" && <p className="lb-error">{phase.message}</p>}
    </div>
  );
}
