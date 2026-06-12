/**
 * THE TRANSLATION CONTRACT. Swedish is canonical and lives in the content
 * defs; other languages are overlays keyed by def id. The app swaps display
 * strings at render time — ids, stats, and the sim never see locales.
 * A content test asserts full parity (every id translated, no orphans).
 */
export interface ContentTranslation {
  towers: Record<
    string,
    {
      name: string;
      description: string;
      mutations: Record<string, { name: string; description: string }>;
    }
  >;
  enemies: Record<string, { name: string }>;
  levels: Record<string, { name: string }>;
  metaUpgrades: Record<string, { name: string; description: string }>;
  sagner: Record<string, { title: string; text: string }>;
}
