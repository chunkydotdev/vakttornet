import { manifest } from "@vakttornet/assets/manifest";
import type { MetaUpgradeDef } from "@vakttornet/content";
import { content } from "../content";
import type { SaveData } from "../save";

interface UpgradesScreenProps {
  save: SaveData;
  onBuy: (upgradeId: string) => void;
  onBack: () => void;
}

function effectText(effect: MetaUpgradeDef["effect"]): string {
  switch (effect.kind) {
    case "damageMult":
      return `+${Math.round(effect.value * 100)}% tower damage per rank`;
    case "rangeMult":
      return `+${Math.round(effect.value * 100)}% tower range per rank`;
    case "startGold":
      return `+${effect.value} starting gold per rank`;
    case "startLives":
      return `+${effect.value} starting lives per rank`;
  }
}

export function UpgradesScreen({ save, onBuy, onBack }: UpgradesScreenProps) {
  return (
    <div className="screen">
      <div className="screen-inner">
        <div className="title-toolbar">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← Back
          </button>
          <span className="points-chip" title="Spendable meta points">
            <img className="icon" src={manifest["ui.coin"]} alt="" />
            {save.points} points
          </span>
        </div>

        <header className="title-header">
          <h1 style={{ fontSize: "2.2rem" }}>Upgrades</h1>
          <p className="tagline">Permanent boosts for every future run.</p>
        </header>

        <ul className="upgrade-list">
          {content.metaUpgrades.map((upgrade) => {
            const rank = save.upgradeRanks[upgrade.id] ?? 0;
            const maxed = rank >= upgrade.maxRank;
            const affordable = save.points >= upgrade.cost;
            return (
              <li key={upgrade.id} className="upgrade-card">
                <div>
                  <h3>
                    {upgrade.name}
                    <span className="rank-pips" title={`Rank ${rank} of ${upgrade.maxRank}`}>
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
                    <span className="upgrade-maxed">Maxed</span>
                  ) : (
                    <>
                      <span className="upgrade-cost">
                        <img className="icon" src={manifest["ui.coin"]} alt="" />
                        {upgrade.cost}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        disabled={!affordable}
                        title={affordable ? undefined : "Not enough points"}
                        onClick={() => onBuy(upgrade.id)}
                      >
                        Buy
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {content.metaUpgrades.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>
            No upgrades available yet.
          </p>
        )}
      </div>
    </div>
  );
}
