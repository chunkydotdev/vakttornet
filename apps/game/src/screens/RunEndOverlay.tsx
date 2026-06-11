interface RunEndOverlayProps {
  won: boolean;
  score: number;
  onRetry: () => void;
  onExit: () => void;
}

export function RunEndOverlay({ won, score, onRetry, onExit }: RunEndOverlayProps) {
  return (
    <div className="run-end-overlay" role="dialog" aria-modal="true">
      <div className="run-end-card">
        <h2 className={won ? "won" : "lost"}>{won ? "Seger!" : "Nederlag"}</h2>
        <p className="run-end-sub">
          {won ? "The tower stands — the path is safe." : "The horde broke through…"}
        </p>
        <p className="run-end-score">
          <span className="label">Score</span>
          {score}
        </p>
        <span className="run-end-points">+{score} points earned</span>
        <div className="run-end-actions">
          <button type="button" className="btn" onClick={onExit}>
            Level select
          </button>
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
