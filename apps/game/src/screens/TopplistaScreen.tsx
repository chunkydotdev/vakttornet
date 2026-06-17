/**
 * Topplista — per-level leaderboards served by the leaderboard Worker.
 * Entries arrive ranked (vårdträd, then score, then earliest submission);
 * the table renders them as served. Locked levels are still viewable —
 * peeking at a board spoils nothing.
 */
import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@vakttornet/leaderboard/api";
import { useContent } from "../localized";
import { useT } from "../i18n";
import { getScores } from "../leaderboard";
import { ENDLESS_LEVEL_ID } from "../endless";

interface TopplistaScreenProps {
  onBack: () => void;
}

type BoardState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; entries: LeaderboardEntry[] };

export function TopplistaScreen({ onBack }: TopplistaScreenProps) {
  const { t } = useT();
  const content = useContent();
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
            ← {t("back")}
          </button>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>{t("topplista")}</h1>
          <p className="tagline">{t("topplistaTagline")}</p>
        </header>

        <div className="topplista-tabs" role="tablist" aria-label={t("mapAria")}>
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
          <button
            key={ENDLESS_LEVEL_ID}
            type="button"
            role="tab"
            aria-selected={levelId === ENDLESS_LEVEL_ID}
            className={levelId === ENDLESS_LEVEL_ID ? "tab active" : "tab"}
            onClick={() => setLevelId(ENDLESS_LEVEL_ID)}
          >
            {t("endlessMode")}
          </button>
        </div>

        <div className="topplista-board">
          {board.kind === "loading" && (
            <div className="topplista-status loading">{t("fetchingBoard")}</div>
          )}
          {board.kind === "error" && (
            <div className="topplista-status">
              <p>{t("boardError")}</p>
              <button
                type="button"
                className="btn"
                onClick={() => setFetchKey((k) => k + 1)}
              >
                {t("tryAgain")}
              </button>
            </div>
          )}
          {board.kind === "ready" && board.entries.length === 0 && (
            <div className="topplista-status">{t("emptyBoard")}</div>
          )}
          {board.kind === "ready" && board.entries.length > 0 && (
            <table className="score-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t("thName")}</th>
                  {/* Endless ranks by waves first (trees are the tiebreak); campaign
                      boards rank by vårdträd first, then score. */}
                  {levelId === ENDLESS_LEVEL_ID ? (
                    <>
                      <th className="num">{t("thWaves")}</th>
                      <th className="num">{t("thVardtrad")}</th>
                    </>
                  ) : (
                    <>
                      <th className="num">{t("thVardtrad")}</th>
                      <th className="num">{t("score")}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {board.entries.map((entry, index) => (
                  <tr key={`${entry.createdAt}:${entry.name}:${index}`}>
                    <td className="rank">{index + 1}</td>
                    <td className="name">{entry.name}</td>
                    {levelId === ENDLESS_LEVEL_ID ? (
                      <>
                        <td className="num">{entry.score}</td>
                        <td className="num">{entry.vardtrad}</td>
                      </>
                    ) : (
                      <>
                        <td className="num">{entry.vardtrad}</td>
                        <td className="num">{entry.score}</td>
                      </>
                    )}
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
