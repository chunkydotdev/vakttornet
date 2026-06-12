import { manifest } from "@vakttornet/assets/manifest";
import type { MetaUpgradeDef } from "@vakttornet/content";
import { content } from "../content";
import { nextUpgradeCost, type SaveData } from "../save";

interface UpgradesScreenProps {
  save: SaveData;
  onBuy: (upgradeId: string) => void;
  onBack: () => void;
}

function effectText(effect: MetaUpgradeDef["effect"]): string {
  switch (effect.kind) {
    case "damageMult":
      return `+${Math.round(effect.value * 100)}% tornskada per rang`;
    case "rangeMult":
      return `+${Math.round(effect.value * 100)}% räckvidd per rang`;
    case "startGold":
      return `+${effect.value} guld vid start per rang`;
    case "startLives":
      return `+${effect.value} liv vid start per rang`;
  }
}

export function UpgradesScreen({ save, onBuy, onBack }: UpgradesScreenProps) {
  return (
    <div className="screen">
      <div className="screen-inner">
        <div className="title-toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Tillbaka
          </button>
          <span className="points-chip" title="Poäng att spendera">
            <img className="icon" src={manifest["ui.coin"]} alt="" />
            {save.points} poäng
          </span>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>Uppgraderingar</h1>
          <p className="tagline">Permanenta förstärkningar inför varje ny strid.</p>
        </header>

        <ul className="upgrade-list">
          {content.metaUpgrades.map((upgrade) => {
            const rank = save.upgradeRanks[upgrade.id] ?? 0;
            const maxed = rank >= upgrade.maxRank;
            // Escalating prices: the next rank costs cost × costGrowth^rank.
            const cost = nextUpgradeCost(upgrade, rank);
            const affordable = save.points >= cost;
            return (
              <li key={upgrade.id} className="upgrade-card">
                <div>
                  <h3>
                    {upgrade.name}
                    <span className="rank-pips" title={`Rang ${rank} av ${upgrade.maxRank}`}>
                      {Array.from({ length: upgrade.maxRank }, (_, i) => (
                        <span key={i} className={i < rank ? "pip filled" : "pip"} />
                      ))}
                    </span>
                  </h3>
                  <p className="upgrade-desc">{upgrade.description}</p>
                  <p className="upgrade-effect">{effectText(upgrade.effect)}</p>
                </div>
                <div className="upgrade-buy">
                  {maxed ? (
                    <span className="upgrade-maxed">Maxad</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-small"
                      disabled={!affordable}
                      title={affordable ? undefined : "För få poäng"}
                      onClick={() => onBuy(upgrade.id)}
                    >
                      Köp — {cost} p
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {content.metaUpgrades.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>
            Inga uppgraderingar att köpa än.
          </p>
        )}
      </div>
    </div>
  );
}
