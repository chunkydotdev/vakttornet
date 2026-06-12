/**
 * Sägner — folklore codex entries unlocked by lifetime deeds.
 *
 * Conditions live in content (SagenDef.condition); the lifetime counters live
 * in the save (DeedCounters). This module is the bridge: evaluate a condition
 * against counters, diff before/after a run for "ny sägen upptäckt" toasts,
 * and format a localized hint line for locked entries.
 */
import type { ContentBundle, SagenCondition, SagenDef } from "@vakttornet/content";
import { getLang, tr } from "./i18n";
import type { DeedCounters } from "./save";

export function isSagenUnlocked(condition: SagenCondition, deeds: DeedCounters): boolean {
  switch (condition.kind) {
    case "kills":
      return (deeds.kills[condition.enemyTypeId] ?? 0) >= condition.count;
    case "petrified":
      return deeds.petrifiedCount >= condition.count;
    case "winLevel":
      return deeds.wonLevelIds.includes(condition.levelId);
    case "flawlessWin":
      return deeds.flawlessWins >= 1;
  }
}

/** Sägner that are locked under `before` but unlocked under `after`. */
export function newlyUnlockedSagner(
  sagner: SagenDef[],
  before: DeedCounters,
  after: DeedCounters,
): SagenDef[] {
  return sagner.filter(
    (s) => !isSagenUnlocked(s.condition, before) && isSagenUnlocked(s.condition, after),
  );
}

/** Subtle hint line for a locked sägen, derived from its condition. Pass the
 * LOCALIZED bundle — enemy/level names come straight from it, and the
 * article/plural heuristics follow the current language. */
export function sagenHint(condition: SagenCondition, content: ContentBundle): string {
  switch (condition.kind) {
    case "kills": {
      const name =
        content.enemies.find((e) => e.id === condition.enemyTypeId)?.name ??
        condition.enemyTypeId;
      if (condition.count === 1) {
        return tr("hintKillOne", { a: indefiniteArticle(name), name: name.toLowerCase() });
      }
      return tr("hintKillMany", { n: condition.count, plural: pluralize(name).toLowerCase() });
    }
    case "petrified":
      return tr("hintPetrify", { n: condition.count });
    case "winLevel": {
      const level = content.levels.find((l) => l.id === condition.levelId);
      return tr("hintWinLevel", { name: level?.name ?? condition.levelId });
    }
    case "flawlessWin":
      return tr("hintFlawless");
  }
}

/** Best-effort indefinite article for creature names. Swedish: nouns ending
 * in unstressed -e or -ing are typically en-words (en vätte, en myling);
 * short neuter nouns like troll take ett. English: "an" before a vowel
 * sound, else "a". Heuristics — good enough for a hint line and degrade
 * gracefully for future content. */
function indefiniteArticle(name: string): string {
  const lower = name.toLowerCase();
  if (getLang() === "en") return /^[aeiou]/.test(lower) ? "an" : "a";
  return lower.endsWith("e") || lower.endsWith("ing") ? "en" : "ett";
}

/** Best-effort plural. Swedish: -e → -ar (vätte → vättar), -ing → -ingar
 * (myling → mylingar), otherwise unchanged (troll → troll, väsen → väsen).
 * English: -s unless the name already ends in s. */
function pluralize(name: string): string {
  const lower = name.toLowerCase();
  if (getLang() === "en") return lower.endsWith("s") ? name : name + "s";
  if (lower.endsWith("e")) return name.slice(0, -1) + "ar";
  if (lower.endsWith("ing")) return name + "ar";
  return name;
}
