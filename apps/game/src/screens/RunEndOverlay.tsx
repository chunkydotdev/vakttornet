import { useState, type FormEvent } from "react";
import { NAME_PATTERN } from "@vakttornet/leaderboard/api";
import { manifest } from "@vakttornet/assets/manifest";
import { LeaderboardError, submitScore } from "../leaderboard";
import { useT, type StringKey } from "../i18n";
import { formatSilver } from "../towerInfo";

/** Present only on a WON run with the leaderboard configured — losses and
 * unconfigured builds never show any leaderboard UI. */
export interface RunEndLeaderboard {
  levelId: string;
  /** vårdträd standing at the moment of victory */
  vardtrad: number;
  /** prefill from the save's last-used name */
  initialName: string;
  /** called with the trimmed name after a successful submit, to persist it */
  onNameUsed: (name: string) => void;
}

interface RunEndOverlayProps {
  won: boolean;
  score: number;
  /** trollsilver banked from this run — the CONVERTED amount (silverFromScore),
   * deliberately different from the raw score */
  silverEarned: number;
  /** titles of sägner whose conditions this run newly satisfied */
  newSagner: string[];
  leaderboard: RunEndLeaderboard | null;
  onRetry: () => void;
  onExit: () => void;
}

export function RunEndOverlay({
  won,
  score,
  silverEarned,
  newSagner,
  leaderboard,
  onRetry,
  onExit,
}: RunEndOverlayProps) {
  const { t } = useT();
  return (
    <div className="run-end-overlay" role="dialog" aria-modal="true">
      <div className="run-end-card">
        <h2 className={won ? "won" : "lost"}>{won ? t("victory") : t("defeat")}</h2>
        <p className="run-end-sub">{won ? t("wonSub") : t("lostSub")}</p>
        <p className="run-end-score">
          <span className="label">{t("score")}</span>
          {score}
        </p>
        <span className="run-end-points">
          <img className="icon" src={manifest["ui.trollsilver"]} alt="" />+
          {t("trollsilverAmount", { s: formatSilver(silverEarned) })}
        </span>
        {newSagner.length > 0 && (
          <ul className="run-end-sagner">
            {newSagner.map((title) => (
              <li key={title}>
                {t("newSagen")} <em>{title}</em>
              </li>
            ))}
          </ul>
        )}
        {won && leaderboard && <LeaderboardPanel score={score} board={leaderboard} />}
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

function LeaderboardPanel({ score, board }: { score: number; board: RunEndLeaderboard }) {
  const { t } = useT();
  const [name, setName] = useState(board.initialName);
  const [phase, setPhase] = useState<SubmitPhase>({ kind: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Guard against double-submit: only ever fire from idle/error.
    if (phase.kind === "sending" || phase.kind === "done") return;
    const trimmed = name.trim();
    if (!NAME_PATTERN.test(trimmed)) {
      setPhase({ kind: "error", message: t("nameError") });
      return;
    }
    setPhase({ kind: "sending" });
    try {
      const res = await submitScore({
        levelId: board.levelId,
        name: trimmed,
        vardtrad: board.vardtrad,
        score,
      });
      board.onNameUsed(trimmed);
      setPhase({ kind: "done", rank: res.rank });
    } catch (err) {
      setPhase({ kind: "error", message: t(submitErrorKey(err)) });
    }
  }

  return (
    <div className="run-end-leaderboard">
      <p className="run-end-vardtrad">{t("yourVardtrad", { n: board.vardtrad })}</p>
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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={phase.kind === "sending"}
          >
            {phase.kind === "sending" ? t("sending") : t("submitToBoard")}
          </button>
        </form>
      )}
      {phase.kind === "error" && <p className="lb-error">{phase.message}</p>}
    </div>
  );
}
