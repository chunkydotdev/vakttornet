interface RunEndOverlayProps {
  won: boolean;
  score: number;
  /** titles of sägner whose conditions this run newly satisfied */
  newSagner: string[];
  onRetry: () => void;
  onExit: () => void;
}

export function RunEndOverlay({ won, score, newSagner, onRetry, onExit }: RunEndOverlayProps) {
  return (
    <div className="run-end-overlay" role="dialog" aria-modal="true">
      <div className="run-end-card">
        <h2 className={won ? "won" : "lost"}>{won ? "Seger!" : "Nederlag"}</h2>
        <p className="run-end-sub">
          {won
            ? "Stugan står kvar — mörkret drar sig tillbaka i skogen."
            : "Mörkret nådde fram till stugan…"}
        </p>
        <p className="run-end-score">
          <span className="label">Poäng</span>
          {score}
        </p>
        <span className="run-end-points">+{score} poäng</span>
        {newSagner.length > 0 && (
          <ul className="run-end-sagner">
            {newSagner.map((title) => (
              <li key={title}>
                Ny sägen upptäckt: <em>{title}</em>
              </li>
            ))}
          </ul>
        )}
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
