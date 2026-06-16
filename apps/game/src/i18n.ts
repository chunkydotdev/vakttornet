/**
 * Hand-rolled i18n for the app shell. Swedish is canonical (copied verbatim
 * from the original UI strings); English is authored with the same care.
 * Proper nouns from the folklore (trollsilver, Näcken, …) stay untranslated.
 *
 * Three consumers:
 *   - React screens use `useT()` (via LangProvider) so everything re-renders
 *     on a language switch.
 *   - Non-React modules (canvas renderer, towerInfo, sagner) use `tr()`,
 *     which reads the module-level current language. Floating texts created
 *     AFTER a switch use the new language; floats already on screen finish
 *     in the old one (acceptable — the toggle lives on the hub anyway).
 *   - Localized content display strings come from `localized.ts`, not here.
 *
 * Interpolation: `{name}` placeholders, filled by `t(lang, key, params)`.
 * Plurals are explicit key pairs (waveCountOne/waveCountMany, …) — at this
 * size a plural engine would be overkill.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "sv" | "en";

export const LANG_KEY = "vakttornet.lang.v1";

const sv = {
  // ---- Document chrome ----
  docTitle: "Vakttornet — försvara stugan",
  tagline: "Mörka skogen vaknar. Håll stigen och försvara stugan.",

  // ---- Shared ----
  back: "Tillbaka",
  play: "Spela",
  trollsilver: "Trollsilver",
  silverToSpend: "Trollsilver att spendera",
  score: "Poäng",
  waveCountOne: "{n} våg",
  waveCountMany: "{n} vågor",

  // ---- Hub (TitleScreen) ----
  sagner: "Sägner",
  topplista: "Topplista",
  nextDefense: "Nästa försvar",
  nextUnlock: "Nästa upplåsning",
  alreadyWon: "redan vunnen",
  silverRemaining: "{s} kvar",
  allMapsUnlocked: "🏆 Alla kartor upplåsta!",
  showAllMaps: "Visa alla kartor →",
  forradTitle: "Förrådet",
  forradSub: "Varaktiga förstärkningar och torn att köpa för trollsilver. Klicka för detaljer.",
  rankOfTitle: "Rang {r} av {m}",
  maxed: "Maxad",
  unlockedCheck: "Upplåst ✓",
  earnSilverNote: "Du tjänar trollsilver varje gång du spelar, vinst som förlust.",

  // ---- Language toggle ----
  languageAria: "Språk",
  langSwedish: "Svenska",
  langEnglish: "Engelska",

  // ---- Mute button ----

  // ---- Levels screen ----
  allMaps: "Alla kartor",
  allMapsTagline: "Varje karta ger trollsilver, vinst som förlust.",
  lockedNeeds: "Låst — kräver {s} trollsilver",

  // ---- Sägner codex ----
  codexDiscoveredTitle: "Upptäckta sägner",
  codexCount: "{n} av {m} sägner upptäckta",
  codexTagline: "Skogens berättelser, samlade vid lyktans sken.",
  codexEmpty: "Skogen har inga sägner att berätta än.",

  // ---- Topplista ----
  topplistaTagline: "Väktarna som höll stigen och deras vårdträd.",
  mapAria: "Karta",
  fetchingBoard: "Hämtar topplistan…",
  boardError: "Topplistan svarar inte just nu.",
  tryAgain: "Försök igen",
  emptyBoard: "Inga sägner har skrivits här ännu. Bli först!",
  thName: "Namn",
  thVardtrad: "Vårdträd",

  // ---- Run HUD ----
  leave: "Lämna",
  lives: "Liv",
  gold: "Guld",
  wave: "Våg",
  gameSpeedAria: "Spelhastighet",
  spacebar: "Mellanslag",
  waveInProgress: "Våg pågår…",
  sendWave: "Skicka våg",
  autoWave: "Auto",
  autoWaveTitle: "Skicka nästa våg automatiskt när stigen är rensad",
  autoWaveAria: "Automatiska vågor",
  towers: "Torn",
  shopHint: "Välj ett torn och klicka sedan på en grön ruta för att bygga. Esc avbryter.",
  forestLoading: "Mörka skogen vaknar…",
  inspect: "Granska",
  inspectorEmpty:
    "Klicka på ett torn på spelplanen för att granska, uppgradera eller sälja det. " +
    "Tryck på mellanslag för att skicka nästa våg.",

  // ---- Placement errors (toasts) ----
  errOccupied: "Det står redan ett torn där",
  errNotBuildable: "Här kan du inte bygga",
  errNoGold: "För lite guld",
  errUnknownTower: "Okänd torntyp",

  // ---- Inspector ----
  placing: "Placerar…",
  costsG: "Kostar {n}g",
  cancelEsc: "Avbryt (Esc)",
  statDamage: "Skada",
  statRange: "Räckvidd",
  statDps: "DPS",
  statIncome: "Inkomst",
  tilesUnit: "{n} rutor",
  levelOf: "Nivå {l}/{m}",
  incomePerWave: "+{n}g per våg",
  upgradeBtn: "Uppgradera — {n}g",
  nextLevelIncome: "Nästa nivå: +{n}g per våg",
  nextLevelStats: "Nästa nivå: {d} skada, {r} räckvidd, {rate}",
  chooseMutation: "Välj utveckling",
  maxLevel: "Maxnivå",
  sellBtn: "Sälj — +{n}g",

  // ---- Run end overlay ----
  victory: "Seger!",
  defeat: "Nederlag",
  wonSub: "Stugan står kvar. Mörkret drar sig tillbaka i skogen.",
  lostSub: "Mörkret nådde fram till stugan…",
  trollsilverAmount: "{s} trollsilver",
  newSagen: "Ny sägen upptäckt:",
  toMaps: "Till kartorna",
  playAgain: "Spela igen",
  yourVardtrad: "Dina vårdträd: {n}",
  rankResult: "Du ligger på plats {n}!",
  namePlaceholder: "Ditt namn",
  sending: "Skickar…",
  submitToBoard: "Skicka till topplistan",
  nameError: "Namnet behöver 2–12 tecken: bokstäver, siffror, mellanslag, - eller _.",
  rateLimited: "Lugn i stugan, vänta en stund.",

  // ---- Förrådet shop modal ----
  close: "Stäng",
  effDamagePerRank: "+{n} % tornskada per rang",
  effRangePerRank: "+{n} % räckvidd per rang",
  effStartGoldPerRank: "+{n} guld vid start per rang",
  effStartLivesPerRank: "+{n} liv vid start per rang",
  rankOf: "Rang {r}/{m}",
  buy: "Köp",
  tooLittleSilver: "För lite trollsilver",
  costPerRankAria: "Kostnad per rang",
  costsGoldToBuild: "Kostar {n} guld att bygga",
  availableInDefense: "✓ Tillgänglig i försvaret",

  // ---- towerInfo: role badges + stat templates ----
  roleIncome: "Inkomst",
  roleLightning: "Blixt",
  rolePetrifies: "Förstenar",
  roleSplash: "Stänk",
  roleSniper: "Prickskytt",
  roleFast: "Snabb",
  roleHeavy: "Tung",
  rateLabelPulse: "Pulstakt",
  rateLabelFire: "Eldtakt",
  ratePulses: "{r} pulser/s",
  rateShots: "{r} skott/s",
  damageAllInRange: "{d} (alla inom räckvidd)",
  dpsPerEnemy: "{v} per fiende",
  mechPulse: "Blixtpuls: träffar ALLA fiender inom räckvidd samtidigt",
  mechPetrify: "Förstenar: fiender rör sig {pct} % långsammare i {secs} s",
  mechSplash: "Stänkskada: full skada på alla fiender inom {r} rutor av nedslaget",
  mechIncome: "Ger +{n} guld efter varje klarad våg. Anfaller inte.",
  mutDamageMult: "Skada ×{m}",
  mutFireRate: "Eldtakt ×{m}",
  mutRangeTileOne: "Räckvidd {sign}{n} ruta",
  mutRangeTileMany: "Räckvidd {sign}{n} rutor",
  mutBounty: "+{p} % guld från egna dråp",
  mutMultishot: "Skjuter mot {n} mål samtidigt",
  mutExecute: "Avrättar väsen under {p} % hälsa (ej bossar)",
  mutBurn: "Antänder: {dps} skada/s i {secs} s",
  mutAuraSlow: "Aura: allt inom räckvidd rör sig {p} % långsammare",
  mutIncome: "+{p} % inkomst",
  mutTowerAura: "Närliggande torn slår {p} % hårdare (inom {r} rutor)",
  mutationTeaser: "Nivå {n}: välj en av två utvecklingar",
  upgradeLineEconomy: "Nivå {n} — {c}g: +{i} guld per våg",
  upgradeLineStats: "Nivå {n} — {c}g: skada {d}, räckvidd {r}",

  // ---- Sägner hints (locked codex entries) ----
  hintKillOne: "Fäll {a} {name}…",
  hintKillMany: "Fäll {n} {plural}…",
  hintPetrify: "Förstena {n} väsen…",
  hintWinLevel: "Vinn {name}…",
  hintFlawless: "Vinn utan att förlora ett liv…",

  // ---- Canvas floating texts ----
  floatPetrified: "förstenad!",
  floatWaveClear: "Våg klar +{n}",
  floatLifeLost: "-1 ♥",
  floatBossFallen: "{name} har fallit!",
} as const satisfies Record<string, string>;

export type StringKey = keyof typeof sv;

const en: Record<StringKey, string> = {
  // ---- Document chrome ----
  docTitle: "Vakttornet — defend the cottage",
  tagline: "The dark forest stirs. Hold the path and defend the cottage.",

  // ---- Shared ----
  back: "Back",
  play: "Play",
  trollsilver: "Trollsilver",
  silverToSpend: "Trollsilver to spend",
  score: "Score",
  waveCountOne: "{n} wave",
  waveCountMany: "{n} waves",

  // ---- Hub (TitleScreen) ----
  sagner: "Tales",
  topplista: "Leaderboard",
  nextDefense: "Next defense",
  nextUnlock: "Next unlock",
  alreadyWon: "already won",
  silverRemaining: "{s} to go",
  allMapsUnlocked: "🏆 All maps unlocked!",
  showAllMaps: "Show all maps →",
  forradTitle: "The Storehouse",
  forradSub: "Lasting boons and towers to buy with trollsilver. Click for details.",
  rankOfTitle: "Rank {r} of {m}",
  maxed: "Maxed",
  unlockedCheck: "Unlocked ✓",
  earnSilverNote: "You earn trollsilver every time you play, win or lose.",

  // ---- Language toggle ----
  languageAria: "Language",
  langSwedish: "Swedish",
  langEnglish: "English",

  // ---- Mute button ----

  // ---- Levels screen ----
  allMaps: "All maps",
  allMapsTagline: "Every map pays trollsilver, win or lose.",
  lockedNeeds: "Locked — needs {s} trollsilver",

  // ---- Sägner codex ----
  codexDiscoveredTitle: "Discovered tales",
  codexCount: "{n} of {m} tales discovered",
  codexTagline: "The forest's stories, gathered by lantern light.",
  codexEmpty: "The forest has no tales to tell yet.",

  // ---- Topplista ----
  topplistaTagline: "The watchers who held the path, and their warden trees.",
  mapAria: "Map",
  fetchingBoard: "Fetching the leaderboard…",
  boardError: "The leaderboard isn't answering right now.",
  tryAgain: "Try again",
  emptyBoard: "No tales have been written here yet. Be the first!",
  thName: "Name",
  thVardtrad: "Warden trees",

  // ---- Run HUD ----
  leave: "Leave",
  lives: "Lives",
  gold: "Gold",
  wave: "Wave",
  gameSpeedAria: "Game speed",
  spacebar: "Spacebar",
  waveInProgress: "Wave underway…",
  sendWave: "Send wave",
  autoWave: "Auto",
  autoWaveTitle: "Send the next wave automatically once the path is clear",
  autoWaveAria: "Auto waves",
  towers: "Towers",
  shopHint: "Pick a tower, then click a green tile to build. Esc cancels.",
  forestLoading: "The dark forest stirs…",
  inspect: "Inspect",
  inspectorEmpty:
    "Click a tower on the board to inspect, upgrade, or sell it. " +
    "Press space to send the next wave.",

  // ---- Placement errors (toasts) ----
  errOccupied: "There's already a tower there",
  errNotBuildable: "You can't build here",
  errNoGold: "Not enough gold",
  errUnknownTower: "Unknown tower type",

  // ---- Inspector ----
  placing: "Placing…",
  costsG: "Costs {n}g",
  cancelEsc: "Cancel (Esc)",
  statDamage: "Damage",
  statRange: "Range",
  statDps: "DPS",
  statIncome: "Income",
  tilesUnit: "{n} tiles",
  levelOf: "Level {l}/{m}",
  incomePerWave: "+{n}g per wave",
  upgradeBtn: "Upgrade — {n}g",
  nextLevelIncome: "Next level: +{n}g per wave",
  nextLevelStats: "Next level: {d} damage, {r} range, {rate}",
  chooseMutation: "Choose a path",
  maxLevel: "Max level",
  sellBtn: "Sell — +{n}g",

  // ---- Run end overlay ----
  victory: "Victory!",
  defeat: "Defeat",
  wonSub: "The cottage still stands. The dark draws back into the forest.",
  lostSub: "The dark reached the cottage…",
  trollsilverAmount: "{s} trollsilver",
  newSagen: "New tale discovered:",
  toMaps: "Back to the maps",
  playAgain: "Play again",
  yourVardtrad: "Your warden trees: {n}",
  rankResult: "You're #{n} on the board!",
  namePlaceholder: "Your name",
  sending: "Sending…",
  submitToBoard: "Send to the leaderboard",
  nameError: "The name needs 2–12 characters: letters, digits, spaces, - or _.",
  rateLimited: "Easy now, wait a moment.",

  // ---- Förrådet shop modal ----
  close: "Close",
  effDamagePerRank: "+{n}% tower damage per rank",
  effRangePerRank: "+{n}% range per rank",
  effStartGoldPerRank: "+{n} gold at start per rank",
  effStartLivesPerRank: "+{n} lives at start per rank",
  rankOf: "Rank {r}/{m}",
  buy: "Buy",
  tooLittleSilver: "Not enough trollsilver",
  costPerRankAria: "Cost per rank",
  costsGoldToBuild: "Costs {n} gold to build",
  availableInDefense: "✓ Ready in your defense",

  // ---- towerInfo: role badges + stat templates ----
  roleIncome: "Income",
  roleLightning: "Lightning",
  rolePetrifies: "Petrifies",
  roleSplash: "Splash",
  roleSniper: "Sniper",
  roleFast: "Fast",
  roleHeavy: "Heavy",
  rateLabelPulse: "Pulse rate",
  rateLabelFire: "Fire rate",
  ratePulses: "{r} pulses/s",
  rateShots: "{r} shots/s",
  damageAllInRange: "{d} (all within range)",
  dpsPerEnemy: "{v} per enemy",
  mechPulse: "Lightning pulse: strikes ALL enemies within range at once",
  mechPetrify: "Petrifies: enemies move {pct}% slower for {secs} s",
  mechSplash: "Splash damage: full damage to all enemies within {r} tiles of the impact",
  mechIncome: "Grants +{n} gold after every cleared wave. Never attacks.",
  mutDamageMult: "Damage ×{m}",
  mutFireRate: "Fire rate ×{m}",
  mutRangeTileOne: "Range {sign}{n} tile",
  mutRangeTileMany: "Range {sign}{n} tiles",
  mutBounty: "+{p}% gold from its own kills",
  mutMultishot: "Fires at {n} targets at once",
  mutExecute: "Executes creatures below {p}% health (not bosses)",
  mutBurn: "Ignites: {dps} damage/s for {secs} s",
  mutAuraSlow: "Aura: everything within range moves {p}% slower",
  mutIncome: "+{p}% income",
  mutTowerAura: "Nearby towers strike {p}% harder (within {r} tiles)",
  mutationTeaser: "Level {n}: choose one of two paths",
  upgradeLineEconomy: "Level {n} — {c}g: +{i} gold per wave",
  upgradeLineStats: "Level {n} — {c}g: damage {d}, range {r}",

  // ---- Sägner hints (locked codex entries) ----
  hintKillOne: "Fell {a} {name}…",
  hintKillMany: "Fell {n} {plural}…",
  hintPetrify: "Petrify {n} creatures…",
  hintWinLevel: "Win {name}…",
  hintFlawless: "Win without losing a single life…",

  // ---- Canvas floating texts ----
  floatPetrified: "petrified!",
  floatWaveClear: "Wave clear +{n}",
  floatLifeLost: "-1 ♥",
  floatBossFallen: "{name} has fallen!",
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { sv, en };

export type TParams = Record<string, string | number>;

/** Core translate: look up `key` in `lang` and fill `{placeholder}` tokens. */
export function t(lang: Lang, key: StringKey, params?: TParams): string {
  let text: string = STRINGS[lang][key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

export function loadLang(): Lang {
  // Shareable links: ?lang=en / ?lang=sv wins over everything and sticks.
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (fromUrl === "sv" || fromUrl === "en") {
      persistLang(fromUrl);
      return fromUrl;
    }
  } catch {
    // no window/URL — fall through
  }
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "sv" || stored === "en") return stored;
  } catch {
    // storage unavailable — fall through to the browser default
  }
  return navigator.language?.toLowerCase().startsWith("sv") ? "sv" : "en";
}

function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // private mode / quota — the toggle still works for this session
  }
}

// ---- Module-level current language --------------------------------------
// The canvas renderer, towerInfo, and the sagner hint formatter live outside
// React; they read this instead of the context. LangProvider keeps it in
// sync (it is set BEFORE React re-renders, so derived strings computed
// during the next render already see the new language).

let currentLang: Lang = loadLang();

export function getLang(): Lang {
  return currentLang;
}

export function setRendererLang(lang: Lang): void {
  currentLang = lang;
}

/** Translate with the module-level current language (non-React call sites). */
export function tr(key: StringKey, params?: TParams): string {
  return t(currentLang, key, params);
}

// ---- Locale-aware number formatting --------------------------------------

/** Always one decimal: 1.6667 → "1,7" (sv) / "1.7" (en). */
export function formatNum1(value: number): string {
  const fixed = value.toFixed(1);
  return currentLang === "sv" ? fixed.replace(".", ",") : fixed;
}

/** Integers plain, otherwise one decimal: 9 → "9", 2.4 → "2,4" / "2.4". */
export function formatNum(value: number): string {
  return Number.isInteger(value) ? String(value) : formatNum1(value);
}

/** Whole trollsilver amounts with thousands grouping: 1114 → "1 114" (sv,
 * non-breaking space) / "1,114" (en). Used everywhere the meta currency is
 * displayed. */
export function formatSilver(value: number): string {
  const sep = currentLang === "sv" ? "\u00A0" : ",";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

// ---- React wiring ---------------------------------------------------------

export interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: currentLang,
  setLang: () => undefined,
});

/** Wraps the app; owns the language state and keeps the persisted value,
 * the module-level language, and the document chrome in sync. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  const setLang = useCallback((next: Lang) => {
    persistLang(next);
    setRendererLang(next); // before the re-render so derived strings agree
    setLangState(next);
  }, []);

  useEffect(() => {
    setRendererLang(lang);
    document.documentElement.lang = lang;
    document.title = t(lang, "docTitle");
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return createElement(LangContext.Provider, { value }, children);
}

/** Screen-side hook: a bound `t` plus the current language and the setter.
 * Consuming the context is what re-renders every screen on a switch. */
export function useT(): {
  t: (key: StringKey, params?: TParams) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
} {
  const { lang, setLang } = useContext(LangContext);
  const bound = useCallback((key: StringKey, params?: TParams) => t(lang, key, params), [lang]);
  return { t: bound, lang, setLang };
}
