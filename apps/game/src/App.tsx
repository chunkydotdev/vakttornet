import { useEffect, useMemo, useState } from "react";
import { useContent } from "./localized";
import { music } from "./game/music";
import {
  applyRunEnd,
  buyTower,
  buyUpgrade,
  computeMetaModifiers,
  loadSave,
  setPlayerName,
  type SaveData,
} from "./save";
import { TitleScreen } from "./screens/TitleScreen";
import { LevelsScreen } from "./screens/LevelsScreen";
import { CodexScreen } from "./screens/CodexScreen";
import { RunScreen } from "./screens/RunScreen";
import { TopplistaScreen } from "./screens/TopplistaScreen";

type Screen =
  | { kind: "title" }
  | { kind: "levels" }
  | { kind: "codex" }
  | { kind: "topplista" }
  | { kind: "run"; levelId: string; runKey: number };

export function App() {
  const [save, setSave] = useState<SaveData>(loadSave);
  const [screen, setScreen] = useState<Screen>({ kind: "title" });
  // Localized bundle: display strings follow the language toggle; ids and
  // stats are identical to the canonical bundle, so lookups and the sim are
  // safe to feed from it.
  const content = useContent();

  const meta = useMemo(
    () => computeMetaModifiers(save.upgradeRanks, content.metaUpgrades),
    [save, content],
  );

  // Screen changes drive the music: in-run plays the map track (the manager
  // falls back to battle.mp3, then silence), everything else plays hub.
  // Same-track requests are no-ops, so retries and the run-end overlay keep
  // the current track running.
  const musicTrack = screen.kind === "run" ? screen.levelId : "hub";
  useEffect(() => {
    music.playTrack(musicTrack);
  }, [musicTrack]);

  if (screen.kind === "run") {
    const level = content.levels.find((l) => l.id === screen.levelId);
    if (level) {
      return (
        <RunScreen
          key={`${screen.levelId}:${screen.runKey}`}
          level={level}
          meta={meta}
          save={save}
          onRunEnd={(silverEarned, deeds) => setSave((s) => applyRunEnd(s, silverEarned, deeds))}
          onPlayerName={(name) => setSave((s) => setPlayerName(s, name))}
          onExit={() => setScreen({ kind: "title" })}
          onRetry={() =>
            setScreen({ kind: "run", levelId: screen.levelId, runKey: screen.runKey + 1 })
          }
        />
      );
    }
    // Unknown level id — fall through to the title screen.
  }

  if (screen.kind === "codex") {
    return <CodexScreen save={save} onBack={() => setScreen({ kind: "title" })} />;
  }

  if (screen.kind === "topplista") {
    return <TopplistaScreen onBack={() => setScreen({ kind: "title" })} />;
  }

  if (screen.kind === "levels") {
    return (
      <LevelsScreen
        save={save}
        onPlay={(levelId) => setScreen({ kind: "run", levelId, runKey: 0 })}
        onBack={() => setScreen({ kind: "title" })}
      />
    );
  }

  return (
    <TitleScreen
      save={save}
      meta={meta}
      onPlay={(levelId) => setScreen({ kind: "run", levelId, runKey: 0 })}
      onShowLevels={() => setScreen({ kind: "levels" })}
      onBuyUpgrade={(upgradeId) => {
        const upgrade = content.metaUpgrades.find((u) => u.id === upgradeId);
        if (!upgrade) return;
        const next = buyUpgrade(save, upgrade);
        if (next) setSave(next);
      }}
      onBuyTower={(towerId) => {
        const tower = content.towers.find((t) => t.id === towerId);
        if (!tower || tower.silverPrice <= 0) return;
        const next = buyTower(save, tower.id, tower.silverPrice);
        if (next) setSave(next);
      }}
      onCodex={() => setScreen({ kind: "codex" })}
      onTopplista={() => setScreen({ kind: "topplista" })}
    />
  );
}
