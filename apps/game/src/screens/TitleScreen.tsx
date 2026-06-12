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
import { content } from "../content";
import { assetUrl } from "../game/render";
import { leaderboardEnabled } from "../leaderboard";
import { nextUpgradeCost, type SaveData } from "../save";
import { formatSilver } from "../towerInfo";
import { MuteButton } from "./MuteButton";
import { ShopItemModal, upgradeIconUrl, type ShopItem } from "./ShopItemModal";

interface TitleScreenProps {
  save: SaveData;
  meta: MetaModifiers;
  onPlay: (levelId: string) => void;
  onShowLevels: () => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onCodex: () => void;
  onTopplista: () => void;
}

export function TitleScreen({
  save,
  meta,
  onPlay,
  onShowLevels,
  onBuyUpgrade,
  onCodex,
  onTopplista,
}: TitleScreenProps) {
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

  // Förrådet: towers that have to be earned (unlockPoints > 0); the three
  // starter towers are always available and stay out of the shop.
  const shopTowers = content.towers.filter((t) => t.unlockPoints > 0);

  return (
    <div className="screen">
      <div className="screen-inner screen-inner-wide">
        <header className="title-header">
          <h1>Vakttornet</h1>
          <p className="tagline">Mörka skogen vaknar. Håll stigen och försvara stugan.</p>
        </header>

        <div className="title-toolbar">
          <span className="points-chip" title="Trollsilver att spendera">
            <img className="icon" src={manifest["ui.trollsilver"]} alt="Trollsilver" />
            {formatSilver(save.points)}
          </span>
          <span className="title-toolbar-actions">
            <button type="button" className="btn" onClick={onCodex}>
              Sägner
            </button>
            {leaderboardEnabled() && (
              <button type="button" className="btn" onClick={onTopplista}>
                Topplista
              </button>
            )}
            <MuteButton />
          </span>
        </div>

        <section className="hub-hero">
          {nextMap && (
            <article className="hero-card hero-play">
              <span className="hero-kicker">Nästa försvar</span>
              <h2 className="hero-level-name">{nextMap.name}</h2>
              <p className="hero-meta">
                {nextMap.waves.length} {nextMap.waves.length === 1 ? "våg" : "vågor"}
                {save.deeds.wonLevelIds.includes(nextMap.id) && " · redan vunnen"}
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="btn btn-primary hero-play-btn"
                  onClick={() => onPlay(nextMap.id)}
                >
                  Spela
                </button>
              </div>
            </article>
          )}

          <article className="hero-card hero-unlock">
            <span className="hero-kicker">Nästa upplåsning</span>
            {nextUnlock ? (
              <>
                <h3 className="hero-unlock-name">{nextUnlock.name}</h3>
                <p className="hero-meta">
                  {nextUnlock.waves.length}{" "}
                  {nextUnlock.waves.length === 1 ? "våg" : "vågor"}
                </p>
                <div className="hero-unlock-progress">
                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${unlockProgress * 100}%` }}
                    />
                  </div>
                  <p className="hero-unlock-remaining">
                    <img className="icon" src={manifest["ui.trollsilver"]} alt="Trollsilver" />
                    {formatSilver(Math.max(0, nextUnlock.unlockPoints - save.totalEarned))} kvar
                  </p>
                </div>
              </>
            ) : (
              <p className="hero-all-unlocked">🏆 Alla kartor upplåsta!</p>
            )}
          </article>
        </section>

        <div className="hub-show-all">
          <button type="button" className="btn" onClick={onShowLevels}>
            Visa alla kartor →
          </button>
        </div>

        <section className="forrad">
          <header className="forrad-head">
            <h2 className="hub-section-title">Förrådet</h2>
            <p className="forrad-sub">
              Varaktiga förstärkningar och torn att låsa upp. Klicka för detaljer.
            </p>
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
                      title={`Rang ${rank} av ${upgrade.maxRank}`}
                    >
                      {Array.from({ length: upgrade.maxRank }, (_, i) => (
                        <span key={i} className={i < rank ? "pip filled" : "pip"} />
                      ))}
                    </span>
                    {maxed ? (
                      <span className="forrad-substatus maxed">Maxad</span>
                    ) : (
                      <span className="forrad-substatus cost">
                        <img
                          className="icon"
                          src={manifest["ui.trollsilver"]}
                          alt="Trollsilver"
                        />
                        {formatSilver(nextUpgradeCost(upgrade, rank))}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {shopTowers.map((tower) => {
              const locked = save.totalEarned < tower.unlockPoints;
              const progress = Math.min(
                1,
                save.totalEarned / Math.max(1, tower.unlockPoints),
              );
              return (
                <button
                  key={tower.id}
                  type="button"
                  className={locked ? "forrad-tile locked" : "forrad-tile"}
                  onClick={() => setShopItem({ kind: "tower", tower })}
                >
                  <img
                    className="forrad-icon"
                    src={assetUrl(tower.assetId) ?? manifest["ui.coin"]}
                    alt=""
                  />
                  <span className="forrad-name">{tower.name}</span>
                  <span className="forrad-status">
                    {locked ? (
                      <>
                        <span className="progress progress-mini">
                          <span
                            className="progress-fill"
                            style={{ width: `${progress * 100}%` }}
                          />
                        </span>
                        <span className="forrad-substatus cost">
                          <img
                            className="icon"
                            src={manifest["ui.trollsilver"]}
                            alt="Trollsilver"
                          />
                          {formatSilver(save.totalEarned)}/{formatSilver(tower.unlockPoints)}
                        </span>
                      </>
                    ) : (
                      <span className="forrad-substatus unlocked">Upplåst ✓</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <p className="muted" style={{ textAlign: "center", fontSize: "0.8rem" }}>
          Du tjänar trollsilver varje gång du spelar, vinst som förlust.
        </p>
      </div>

      {shopItem && (
        <ShopItemModal
          item={shopItem}
          save={save}
          meta={meta}
          onBuy={onBuyUpgrade}
          onClose={() => setShopItem(null)}
        />
      )}
    </div>
  );
}
