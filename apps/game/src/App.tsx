import { useMemo, useState } from "react";
import { content } from "./content";
import { applyRunEnd, buyUpgrade, computeMetaModifiers, loadSave, type SaveData } from "./save";
import { TitleScreen } from "./screens/TitleScreen";
import { UpgradesScreen } from "./screens/UpgradesScreen";
import { RunScreen } from "./screens/RunScreen";

type Screen =
  | { kind: "title" }
  | { kind: "upgrades" }
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
          onRunEnd={(score) => setSave((s) => applyRunEnd(s, score))}
          onExit={() => setScreen({ kind: "title" })}
          onRetry={() =>
            setScreen({ kind: "run", levelId: screen.levelId, runKey: screen.runKey + 1 })
          }
        />
      );
    }
    // Unknown level id — fall through to the title screen.
  }

  if (screen.kind === "upgrades") {
    return (
      <UpgradesScreen
        save={save}
        onBuy={(upgradeId) => {
          const upgrade = content.metaUpgrades.find((u) => u.id === upgradeId);
          if (!upgrade) return;
          const next = buyUpgrade(save, upgrade);
          if (next) setSave(next);
        }}
        onBack={() => setScreen({ kind: "title" })}
      />
    );
  }

  return (
    <TitleScreen
      save={save}
      onPlay={(levelId) => setScreen({ kind: "run", levelId, runKey: 0 })}
      onUpgrades={() => setScreen({ kind: "upgrades" })}
    />
  );
}
