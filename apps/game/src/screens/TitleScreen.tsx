/**
 * The hub — first thing a player (and the jury) sees. Three zones:
 *   1. Hero: the recommended next map + progress toward the next unlock.
 *   2. "Visa alla kartor" → the full level grid (LevelsScreen).
 *   3. Förrådet: meta upgrades and unlockable towers as compact tiles;
 *      clicking one opens the ShopItemModal with full details.
 */
import { useState } from "react";
import { manifest } from "@vakttornet/assets/manifest";
import type { MetaModifiers } from "@vakttornet/sim";
import { useContent } from "../localized";
import { useT } from "../i18n";
import { assetUrl } from "../game/render";
import { leaderboardEnabled } from "../leaderboard";
import { nextUpgradeCost, type SaveData } from "../save";
import { formatSilver } from "../towerInfo";
import { LangToggle } from "./LangToggle";
import { ShopItemModal, upgradeIconUrl, type ShopItem } from "./ShopItemModal";

interface TitleScreenProps {
  save: SaveData;
  meta: MetaModifiers;
  onPlay: (levelId: string) => void;
  onShowLevels: () => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onBuyTower: (towerId: string) => void;
  onCodex: () => void;
  onTopplista: () => void;
}

export function TitleScreen({
  save,
  meta,
  onPlay,
  onShowLevels,
  onBuyUpgrade,
  onBuyTower,
  onCodex,
  onTopplista,
}: TitleScreenProps) {
  const { t } = useT();
  const content = useContent();
  const [shopItem, setShopItem] = useState<ShopItem | null>(null);

  // Recommended map: first unlocked level not yet won; once everything
  // unlocked is beaten, point at the hardest unlocked map for replays.
  const unlockedLevels = content.levels.filter((l) => l.unlockPoints <= save.totalEarned);
  const nextMap =
    unlockedLevels.find((l) => !save.deeds.wonLevelIds.includes(l.id)) ??
    unlockedLevels[unlockedLevels.length - 1];
  const nextUnlock = content.levels.find((l) => l.unlockPoints > save.totalEarned);
  const unlockProgress = nextUnlock
    ? Math.min(1, save.totalEarned / Math.max(1, nextUnlock.unlockPoints))
    : 1;

  // Förrådet: towers that have to be bought (silverPrice > 0); the three
  // starter towers are always available and stay out of the shop.
  const shopTowers = content.towers.filter((tower) => tower.silverPrice > 0);

  const waveCount = (n: number) => t(n === 1 ? "waveCountOne" : "waveCountMany", { n });

  return (
    <div className="screen">
      <div className="screen-inner screen-inner-wide">
        <header className="title-header">
          <h1>Vakttornet</h1>
          <p className="tagline">{t("tagline")}</p>
        </header>

        <div className="title-toolbar">
          <span className="points-chip" title={t("silverToSpend")}>
            <img className="icon" src={manifest["ui.trollsilver"]} alt={t("trollsilver")} />
            {formatSilver(save.points)}
          </span>
          <span className="title-toolbar-actions">
            <button type="button" className="btn" onClick={onCodex}>
              {t("sagner")}
            </button>
            {leaderboardEnabled() && (
              <button type="button" className="btn" onClick={onTopplista}>
                {t("topplista")}
              </button>
            )}
            <LangToggle />
          </span>
        </div>

        <section className="hub-hero">
          {nextMap && (
            <article className="hero-card hero-play">
              <span className="hero-kicker">{t("nextDefense")}</span>
              <h2 className="hero-level-name">{nextMap.name}</h2>
              <p className="hero-meta">
                {waveCount(nextMap.waves.length)}
                {save.deeds.wonLevelIds.includes(nextMap.id) && ` · ${t("alreadyWon")}`}
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-primary hero-play-btn"
                  onClick={() => onPlay(nextMap.id)}
                >
                  {t("play")}
                </button>
              </div>
            </article>
          )}

          <article className="hero-card hero-unlock">
            <span className="hero-kicker">{t("nextUnlock")}</span>
            {nextUnlock ? (
              <>
                <h3 className="hero-unlock-name">{nextUnlock.name}</h3>
                <p className="hero-meta">{waveCount(nextUnlock.waves.length)}</p>
                <div className="hero-unlock-progress">
                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${unlockProgress * 100}%` }}
                    />
                  </div>
                  <p className="hero-unlock-remaining">
                    <img
                      className="icon"
                      src={manifest["ui.trollsilver"]}
                      alt={t("trollsilver")}
                    />
                    {t("silverRemaining", {
                      s: formatSilver(Math.max(0, nextUnlock.unlockPoints - save.totalEarned)),
                    })}
                  </p>
                </div>
              </>
            ) : (
              <p className="hero-all-unlocked">{t("allMapsUnlocked")}</p>
            )}
          </article>
        </section>

        <div className="hub-show-all">
          <button type="button" className="btn" onClick={onShowLevels}>
            {t("showAllMaps")}
          </button>
        </div>

        <section className="forrad">
          <header className="forrad-head">
            <h2 className="hub-section-title">{t("forradTitle")}</h2>
            <p className="forrad-sub">{t("forradSub")}</p>
          </header>
          <div className="forrad-grid">
            {content.metaUpgrades.map((upgrade) => {
              const rank = save.upgradeRanks[upgrade.id] ?? 0;
              const maxed = rank >= upgrade.maxRank;
              return (
                <button
                  key={upgrade.id}
                  type="button"
                  className="forrad-tile"
                  onClick={() => setShopItem({ kind: "upgrade", upgrade })}
                >
                  <img className="forrad-icon" src={upgradeIconUrl(upgrade)} alt="" />
                  <span className="forrad-name">{upgrade.name}</span>
                  <span className="forrad-status">
                    <span
                      className="rank-pips rank-pips-small"
                      title={t("rankOfTitle", { r: rank, m: upgrade.maxRank })}
                    >
                      {Array.from({ length: upgrade.maxRank }, (_, i) => (
                        <span key={i} className={i < rank ? "pip filled" : "pip"} />
                      ))}
                    </span>
                    {maxed ? (
                      <span className="forrad-substatus maxed">{t("maxed")}</span>
                    ) : (
                      <span className="forrad-substatus cost">
                        <img
                          className="icon"
                          src={manifest["ui.trollsilver"]}
                          alt={t("trollsilver")}
                        />
                        {formatSilver(nextUpgradeCost(upgrade, rank))}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {shopTowers.map((tower) => {
              const owned = save.ownedTowerIds.includes(tower.id);
              return (
                <button
                  key={tower.id}
                  type="button"
                  className={owned ? "forrad-tile" : "forrad-tile locked"}
                  onClick={() => setShopItem({ kind: "tower", tower })}
                >
                  <img
                    className="forrad-icon"
                    src={assetUrl(tower.assetId) ?? manifest["ui.coin"]}
                    alt=""
                  />
                  <span className="forrad-name">{tower.name}</span>
                  <span className="forrad-status">
                    {owned ? (
                      <span className="forrad-substatus unlocked">{t("unlockedCheck")}</span>
                    ) : (
                      <span className="forrad-substatus cost">
                        <img
                          className="icon"
                          src={manifest["ui.trollsilver"]}
                          alt={t("trollsilver")}
                        />
                        {formatSilver(tower.silverPrice)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <p className="muted" style={{ textAlign: "center", fontSize: "0.8rem" }}>
          {t("earnSilverNote")}
        </p>
      </div>

      {shopItem && (
        <ShopItemModal
          item={shopItem}
          save={save}
          meta={meta}
          onBuy={onBuyUpgrade}
          onBuyTower={onBuyTower}
          onClose={() => setShopItem(null)}
        />
      )}
    </div>
  );
}
