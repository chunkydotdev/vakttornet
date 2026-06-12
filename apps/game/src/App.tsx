import { useMemo, useState } from "react";
import { content } from "./content";
import {
  applyRunEnd,
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

  const meta = useMemo(
    () => computeMetaModifiers(save.upgradeRanks, content.metaUpgrades),
    [save],
  );

  if (screen.kind === "run") {
    const level = content.levels.find((l) => l.id === screen.levelId);
    if (level) {
      return (
        <RunScreen
          key={`${screen.levelId}:${screen.runKey}`}
          level={level}
          meta={meta}
          save={save}
          onRunEnd={(score, deeds) => setSave((s) => applyRunEnd(s, score, deeds))}
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
      onCodex={() => setScreen({ kind: "codex" })}
      onTopplista={() => setScreen({ kind: "topplista" })}
    />
  );
}
