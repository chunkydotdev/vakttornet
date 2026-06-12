/**
 * Detail popup for Förrådet items on the hub — one modal, two bodies:
 * meta upgrades and towers, both buyable here for trollsilver.
 * Closes on Esc, backdrop click, or the ✕ button. All numbers are derived
 * from content data — costs via nextUpgradeCost/silverPrice, tower stats
 * via towerInfo.
 */
import { useEffect, useRef } from "react";
import { manifest } from "@vakttornet/assets/manifest";
import type { MetaUpgradeDef, TowerDef } from "@vakttornet/content";
import type { MetaModifiers } from "@vakttornet/sim";
import { assetUrl } from "../game/render";
import { nextUpgradeCost, type SaveData } from "../save";
import {
  damageValue,
  dpsValue,
  formatSilver,
  formatSv,
  isEconomy,
  mechanicLines,
  mutationTeaser,
  rateLabel,
  rateValue,
  roleBadge,
} from "../towerInfo";

export type ShopItem =
  | { kind: "upgrade"; upgrade: MetaUpgradeDef }
  | { kind: "tower"; tower: TowerDef };

interface ShopItemModalProps {
  item: ShopItem;
  save: SaveData;
  meta: MetaModifiers;
  onBuy: (upgradeId: string) => void;
  onBuyTower: (towerId: string) => void;
  onClose: () => void;
}

/** Per-rank effect copy, derived from the effect data (Swedish). */
export function upgradeEffectText(effect: MetaUpgradeDef["effect"]): string {
  switch (effect.kind) {
    case "damageMult":
      return `+${Math.round(effect.value * 100)} % tornskada per rang`;
    case "rangeMult":
      return `+${Math.round(effect.value * 100)} % räckvidd per rang`;
    case "startGold":
      return `+${effect.value} guld vid start per rang`;
    case "startLives":
      return `+${effect.value} liv vid start per rang`;
  }
}

/** Upgrade icons come from the manifest via assetId; the coin is a safe
 * fallback so a missing icon never breaks the hub. */
export function upgradeIconUrl(upgrade: MetaUpgradeDef): string {
  return assetUrl(upgrade.assetId) ?? manifest["ui.coin"];
}

export function ShopItemModal({
  item,
  save,
  meta,
  onBuy,
  onBuyTower,
  onClose,
}: ShopItemModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Esc closes; focus moves into the dialog so keyboard users land inside.
  useEffect(() => {
    cardRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const title = item.kind === "upgrade" ? item.upgrade.name : item.tower.name;

  return (
    <div
      className="shop-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        className="shop-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <button type="button" className="shop-modal-close" aria-label="Stäng" onClick={onClose}>
          ✕
        </button>
        {item.kind === "upgrade" ? (
          <UpgradeBody upgrade={item.upgrade} save={save} onBuy={onBuy} />
        ) : (
          <TowerBody tower={item.tower} save={save} meta={meta} onBuy={onBuyTower} />
        )}
      </div>
    </div>
  );
}

function UpgradeBody({
  upgrade,
  save,
  onBuy,
}: {
  upgrade: MetaUpgradeDef;
  save: SaveData;
  onBuy: (upgradeId: string) => void;
}) {
  const rank = save.upgradeRanks[upgrade.id] ?? 0;
  const maxed = rank >= upgrade.maxRank;
  const cost = nextUpgradeCost(upgrade, rank);
  const affordable = save.points >= cost;
  const rankCosts = Array.from({ length: upgrade.maxRank }, (_, i) =>
    nextUpgradeCost(upgrade, i),
  );

  return (
    <>
      <div className="shop-modal-head">
        <span className="shop-modal-icon">
          <img src={upgradeIconUrl(upgrade)} alt="" />
        </span>
        <div>
          <h2>{upgrade.name}</h2>
          <p className="shop-modal-sub">
            <span className="rank-pips" title={`Rang ${rank} av ${upgrade.maxRank}`}>
              {Array.from({ length: upgrade.maxRank }, (_, i) => (
                <span key={i} className={i < rank ? "pip filled" : "pip"} />
              ))}
            </span>
            Rang {rank}/{upgrade.maxRank}
          </p>
        </div>
      </div>

      <p className="tower-flavor">{upgrade.description}</p>
      <p className="mechanic-line">{upgradeEffectText(upgrade.effect)}</p>

      <div className="shop-modal-buy">
        {maxed ? (
          <span className="upgrade-maxed">Maxad</span>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!affordable}
            title={affordable ? undefined : "För lite trollsilver"}
            onClick={() => onBuy(upgrade.id)}
          >
            Köp — <img className="icon" src={manifest["ui.trollsilver"]} alt="" />{" "}
            {formatSilver(cost)}
          </button>
        )}
        <span className="points-chip points-chip-small" title="Trollsilver att spendera">
          <img className="icon" src={manifest["ui.trollsilver"]} alt="Trollsilver" />
          {formatSilver(save.points)}
        </span>
      </div>

      <div className="cost-ladder" aria-label="Kostnad per rang">
        {rankCosts.map((c, i) => (
          <span
            key={i}
            className={
              i < rank ? "ladder-step owned" : i === rank ? "ladder-step next" : "ladder-step"
            }
          >
            {i < rank ? "✓ " : ""}
            <img className="icon" src={manifest["ui.trollsilver"]} alt="" />
            {formatSilver(c)}
          </span>
        ))}
      </div>
    </>
  );
}

function TowerBody({
  tower,
  save,
  meta,
  onBuy,
}: {
  tower: TowerDef;
  save: SaveData;
  meta: MetaModifiers;
  onBuy: (towerId: string) => void;
}) {
  const l1 = tower.levels[0];
  if (!l1) return null;
  const economy = isEconomy(l1);
  const owned = tower.silverPrice === 0 || save.ownedTowerIds.includes(tower.id);
  const affordable = save.points >= tower.silverPrice;
  const teaser = mutationTeaser(tower);

  return (
    <>
      <div className="shop-modal-head">
        <span className="shop-modal-icon">
          <img src={assetUrl(tower.assetId) ?? manifest["ui.coin"]} alt="" />
        </span>
        <div>
          <h2>
            {tower.name} <span className="role-badge">{roleBadge(tower)}</span>
          </h2>
          <p className="shop-modal-sub">Kostar {l1.cost} guld att bygga</p>
        </div>
      </div>

      <p className="tower-flavor">{tower.description}</p>

      {!economy && (
        <div className="stat-table">
          <div className="stat-row">
            <span className="stat-label">Skada</span>
            <span className="stat-value">{damageValue(tower, l1, meta.damageMult)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">{rateLabel(tower)}</span>
            <span className="stat-value">{rateValue(tower, l1)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">DPS</span>
            <span className="stat-value">{dpsValue(tower, l1, meta.damageMult)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Räckvidd</span>
            <span className="stat-value">{formatSv(l1.range * meta.rangeMult)} rutor</span>
          </div>
        </div>
      )}

      {mechanicLines(tower, l1).map((line) => (
        <p key={line} className="mechanic-line">
          {line}
        </p>
      ))}

      {teaser && <p className="mutation-teaser">⟡ {teaser}</p>}

      {owned ? (
        <p className="shop-modal-available">✓ Tillgänglig i försvaret</p>
      ) : (
        <div className="shop-modal-buy">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!affordable}
            title={affordable ? undefined : "För lite trollsilver"}
            onClick={() => onBuy(tower.id)}
          >
            Köp — <img className="icon" src={manifest["ui.trollsilver"]} alt="" />{" "}
            {formatSilver(tower.silverPrice)}
          </button>
          <span className="points-chip points-chip-small" title="Trollsilver att spendera">
            <img className="icon" src={manifest["ui.trollsilver"]} alt="Trollsilver" />
            {formatSilver(save.points)}
          </span>
        </div>
      )}
    </>
  );
}
