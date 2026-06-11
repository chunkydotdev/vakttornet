/**
 * Sägner — folklore codex entries unlocked by lifetime deeds.
 *
 * Conditions live in content (SagenDef.condition); the lifetime counters live
 * in the save (DeedCounters). This module is the bridge: evaluate a condition
 * against counters, diff before/after a run for "ny sägen upptäckt" toasts,
 * and format a Swedish hint line for locked entries.
 */
import type { ContentBundle, SagenCondition, SagenDef } from "@vakttornet/content";
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

/** Subtle Swedish hint line for a locked sägen, derived from its condition. */
export function sagenHint(condition: SagenCondition, content: ContentBundle): string {
  switch (condition.kind) {
    case "kills": {
      const name =
        content.enemies.find((e) => e.id === condition.enemyTypeId)?.name ??
        condition.enemyTypeId;
      if (condition.count === 1) {
        return `Fäll ${indefiniteArticle(name)} ${name.toLowerCase()}…`;
      }
      return `Fäll ${condition.count} ${pluralize(name).toLowerCase()}…`;
    }
    case "petrified":
      return `Förstena ${condition.count} väsen…`;
    case "winLevel": {
      const level = content.levels.find((l) => l.id === condition.levelId);
      return `Vinn ${level?.name ?? condition.levelId}…`;
    }
    case "flawlessWin":
      return "Vinn utan att förlora ett liv…";
  }
}

/** Best-effort Swedish indefinite article for creature names: nouns ending in
 * unstressed -e or -ing are typically en-words (en vätte, en myling); short
 * neuter nouns like troll take ett. Heuristic — good enough for a hint line
 * and degrades gracefully for future content. */
function indefiniteArticle(name: string): "en" | "ett" {
  const lower = name.toLowerCase();
  return lower.endsWith("e") || lower.endsWith("ing") ? "en" : "ett";
}

/** Best-effort Swedish plural: -e → -ar (vätte → vättar), -ing → -ingar
 * (myling → mylingar), otherwise unchanged (troll → troll, väsen → väsen). */
function pluralize(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith("e")) return name.slice(0, -1) + "ar";
  if (lower.endsWith("ing")) return name + "ar";
  return name;
}
