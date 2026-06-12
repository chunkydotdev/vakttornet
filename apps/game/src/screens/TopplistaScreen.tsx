/**
 * Topplista — per-level leaderboards served by the leaderboard Worker.
 * Entries arrive ranked (vårdträd, then score, then earliest submission);
 * the table renders them as served. Locked levels are still viewable —
 * peeking at a board spoils nothing.
 */
import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@vakttornet/leaderboard/api";
import { content } from "../content";
import { getScores } from "../leaderboard";

interface TopplistaScreenProps {
  onBack: () => void;
}

type BoardState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; entries: LeaderboardEntry[] };

export function TopplistaScreen({ onBack }: TopplistaScreenProps) {
  const [levelId, setLevelId] = useState<string>(content.levels[0]?.id ?? "");
  const [board, setBoard] = useState<BoardState>({ kind: "loading" });
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    if (!levelId) return;
    let cancelled = false;
    setBoard({ kind: "loading" });
    getScores(levelId)
      .then((res) => {
        if (!cancelled) setBoard({ kind: "ready", entries: res.entries });
      })
      .catch(() => {
        if (!cancelled) setBoard({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [levelId, fetchKey]);

  // Escape backs out, mirroring the back-navigation of the other screens.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Escape") onBack();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  return (
    <div className="screen">
      <div className="screen-inner">
        <div className="title-toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Tillbaka
          </button>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>Topplista</h1>
          <p className="tagline">Väktarna som höll stigen och deras vårdträd.</p>
        </header>

        <div className="topplista-tabs" role="tablist" aria-label="Karta">
          {content.levels.map((level) => (
            <button
              key={level.id}
              type="button"
              role="tab"
              aria-selected={level.id === levelId}
              className={level.id === levelId ? "tab active" : "tab"}
              onClick={() => setLevelId(level.id)}
            >
              {level.name}
            </button>
          ))}
        </div>

        <div className="topplista-board">
          {board.kind === "loading" && (
            <div className="topplista-status loading">Hämtar topplistan…</div>
          )}
          {board.kind === "error" && (
            <div className="topplista-status">
              <p>Topplistan svarar inte just nu.</p>
              <button
                type="button"
                className="btn"
                onClick={() => setFetchKey((k) => k + 1)}
              >
                Försök igen
              </button>
            </div>
          )}
          {board.kind === "ready" && board.entries.length === 0 && (
            <div className="topplista-status">
              Inga sägner har skrivits här ännu. Bli först!
            </div>
          )}
          {board.kind === "ready" && board.entries.length > 0 && (
            <table className="score-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Namn</th>
                  <th className="num">Vårdträd</th>
                  <th className="num">Poäng</th>
                </tr>
              </thead>
              <tbody>
                {board.entries.map((entry, index) => (
                  <tr key={`${entry.createdAt}:${entry.name}:${index}`}>
                    <td className="rank">{index + 1}</td>
                    <td className="name">{entry.name}</td>
                    <td className="num">{entry.vardtrad}</td>
                    <td className="num">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
