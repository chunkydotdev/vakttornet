import { useState, type FormEvent } from "react";
import { NAME_PATTERN } from "@vakttornet/leaderboard/api";
import { manifest } from "@vakttornet/assets/manifest";
import { LeaderboardError, submitScore } from "../leaderboard";
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
  return (
    <div className="run-end-overlay" role="dialog" aria-modal="true">
      <div className="run-end-card">
        <h2 className={won ? "won" : "lost"}>{won ? "Seger!" : "Nederlag"}</h2>
        <p className="run-end-sub">
          {won
            ? "Stugan står kvar. Mörkret drar sig tillbaka i skogen."
            : "Mörkret nådde fram till stugan…"}
        </p>
        <p className="run-end-score">
          <span className="label">Poäng</span>
          {score}
        </p>
        <span className="run-end-points">
          <img className="icon" src={manifest["ui.trollsilver"]} alt="" />+
          {formatSilver(silverEarned)} trollsilver
        </span>
        {newSagner.length > 0 && (
          <ul className="run-end-sagner">
            {newSagner.map((title) => (
              <li key={title}>
                Ny sägen upptäckt: <em>{title}</em>
              </li>
            ))}
          </ul>
        )}
        {won && leaderboard && <LeaderboardPanel score={score} board={leaderboard} />}
        <div className="run-end-actions">
          <button type="button" className="btn" onClick={onExit}>
            Till kartorna
          </button>
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Spela igen
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

function submitErrorText(err: unknown): string {
  if (err instanceof LeaderboardError && err.code === "rate-limited") {
    return "Lugn i stugan, vänta en stund.";
  }
  return "Topplistan svarar inte just nu.";
}

function LeaderboardPanel({ score, board }: { score: number; board: RunEndLeaderboard }) {
  const [name, setName] = useState(board.initialName);
  const [phase, setPhase] = useState<SubmitPhase>({ kind: "idle" });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Guard against double-submit: only ever fire from idle/error.
    if (phase.kind === "sending" || phase.kind === "done") return;
    const trimmed = name.trim();
    if (!NAME_PATTERN.test(trimmed)) {
      setPhase({
        kind: "error",
        message: "Namnet behöver 2–12 tecken: bokstäver, siffror, mellanslag, - eller _.",
      });
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
      setPhase({ kind: "error", message: submitErrorText(err) });
    }
  }

  return (
    <div className="run-end-leaderboard">
      <p className="run-end-vardtrad">Dina vårdträd: {board.vardtrad}</p>
      {phase.kind === "done" ? (
        <p className="lb-success">Du ligger på plats {phase.rank}!</p>
      ) : (
        <form className="lb-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            maxLength={12}
            placeholder="Ditt namn"
            aria-label="Ditt namn"
            disabled={phase.kind === "sending"}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={phase.kind === "sending"}
          >
            {phase.kind === "sending" ? "Skickar…" : "Skicka till topplistan"}
          </button>
        </form>
      )}
      {phase.kind === "error" && <p className="lb-error">{phase.message}</p>}
    </div>
  );
}
