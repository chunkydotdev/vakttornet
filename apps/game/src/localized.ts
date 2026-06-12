/**
 * Localized content bundles. Swedish is canonical and lives in the content
 * defs; `en` (from @vakttornet/content) is an overlay keyed by def id.
 * `localizeContent` returns a memoized deep copy with only DISPLAY strings
 * swapped — ids, stats, conditions, and globals are untouched, so a
 * localized bundle is safe anywhere the canonical one is (including the sim,
 * which never reads names).
 */
import { en, type ContentBundle, type ContentTranslation } from "@vakttornet/content";
import { content } from "./content";
import { useT, type Lang } from "./i18n";

const OVERLAYS: Partial<Record<Lang, ContentTranslation>> = { en };

/** Deep copy with display strings swapped from the overlay. Missing ids fall
 * back to the Swedish original — the content test asserts full parity, this
 * is just graceful degradation. */
function applyOverlay(bundle: ContentBundle, overlay: ContentTranslation): ContentBundle {
  return {
    ...bundle,
    towers: bundle.towers.map((tower) => {
      const tr = overlay.towers[tower.id];
      return {
        ...tower,
        name: tr?.name ?? tower.name,
        description: tr?.description ?? tower.description,
        mutations: tower.mutations?.map((mutation) => {
          const mtr = tr?.mutations[mutation.id];
          return {
            ...mutation,
            name: mtr?.name ?? mutation.name,
            description: mtr?.description ?? mutation.description,
          };
        }),
      };
    }),
    enemies: bundle.enemies.map((enemy) => ({
      ...enemy,
      name: overlay.enemies[enemy.id]?.name ?? enemy.name,
    })),
    levels: bundle.levels.map((level) => ({
      ...level,
      name: overlay.levels[level.id]?.name ?? level.name,
    })),
    metaUpgrades: bundle.metaUpgrades.map((upgrade) => ({
      ...upgrade,
      name: overlay.metaUpgrades[upgrade.id]?.name ?? upgrade.name,
      description: overlay.metaUpgrades[upgrade.id]?.description ?? upgrade.description,
    })),
    sagner: bundle.sagner.map((sagen) => ({
      ...sagen,
      title: overlay.sagner[sagen.id]?.title ?? sagen.title,
      text: overlay.sagner[sagen.id]?.text ?? sagen.text,
    })),
  };
}

/** Memoized per (bundle, lang) — the app only ever passes the singleton
 * bundle, so each language is localized at most once. */
const cache = new WeakMap<ContentBundle, Map<Lang, ContentBundle>>();

export function localizeContent(bundle: ContentBundle, lang: Lang): ContentBundle {
  const overlay = OVERLAYS[lang];
  if (!overlay) return bundle; // sv (canonical) — nothing to swap

  let byLang = cache.get(bundle);
  if (!byLang) {
    byLang = new Map();
    cache.set(bundle, byLang);
  }
  let localized = byLang.get(lang);
  if (!localized) {
    localized = applyOverlay(bundle, overlay);
    byLang.set(lang, localized);
  }
  return localized;
}

/** The app's content bundle in the current language. Re-renders consumers on
 * a language switch (it reads the language from context via useT). */
export function useContent(): ContentBundle {
  const { lang } = useT();
  return localizeContent(content, lang);
}
