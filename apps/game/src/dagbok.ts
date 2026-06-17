/**
 * Tornets dagbok — the watchtower-keeper's diary. A player-facing, in-world
 * changelog: each real change to the game retold as a cozy note from the
 * keeper, newest first. Deliberately non-technical (no version numbers, no
 * jargon) and on-theme (sagoton). Adding an entry = prepend to BOTH arrays
 * with a NEW, matching `id` — that id is how the "unseen" blue dot knows
 * something fresh has arrived (see hasUnseenDagbok).
 *
 * This is pure presentation copy, not game data — it never touches the sim or
 * content schema, so it lives in the app and is swapped by language like the
 * rest of the UI strings (see i18n.ts / localized.ts).
 */
import type { Lang } from "./i18n";

export interface DagbokEntry {
  /** stable, language-independent id — MUST match across the sv/en arrays at
   * the same position. The newest entry's id is the "seen" marker. */
  id: string;
  /** soft, non-technical time label ("Just nu", "Nyligen", …) */
  when: string;
  title: string;
  body: string;
}

const sv: DagbokEntry[] = [
  {
    id: "targeting",
    when: "Just nu",
    title: "Säg åt tornen vem de ska sikta på",
    body:
      "Förut sköt varje torn alltid på den fiende som hunnit längst. Nu bestämmer " +
      "du själv: främst eller sist i ledet, eller den med mest eller minst liv. " +
      "Markera ett torn och peka ut målet med ikonerna, eller tryck T.",
  },
  {
    id: "tower-sight",
    when: "Nyligen",
    title: "Skarpare blick över tornen",
    body:
      "Nu syns det svart på vitt när ett torn får extra kraft av sin granne, som " +
      "vårdträdets rötter. Snabbtangenter lyder med: U rustar upp, S säljer, och " +
      "1 eller 2 väljer förvandling. Tecknet för ett förvandlat torn sitter dessutom " +
      "prydligt på dess egen ruta numera, i stället för att skugga grannen ovanför.",
  },
  {
    id: "endless-watch",
    when: "Nyligen",
    title: "Den eviga vakten är öppen",
    body:
      "Ett nytt sätt att spela har slagit upp portarna under Alternativa berättelser. " +
      "I Evig vakt råder en enda natt utan gryning, och vågorna växer sig vildare ända " +
      "tills mörkret tar dig. Alla väktare står lika, utan förstärkningar och med alla " +
      "torn till hands. På topplistan gäller en enda sak: hur länge du höll stigen.",
  },
  {
    id: "auto-and-bosses",
    when: "Nyligen",
    title: "Vågor på rad, och bjässar att akta sig för",
    body:
      "Trött på att vinka fram varje våg för hand? Slå på Auto uppe i fältet, " +
      "så rullar de in av sig själva. Men släpp aldrig en riktig bjässe ända " +
      "fram till stugan. Då är natten slut på direkten, hur många liv du än har kvar.",
  },
  {
    id: "english",
    when: "Nyligen",
    title: "Sägnerna på främmande tunga",
    body:
      "Den som hellre läser på engelska kan numera byta språk uppe i hörnet. " +
      "Samma skog, samma troll, andra ord.",
  },
  {
    id: "forradet",
    when: "Nyligen",
    title: "Förrådet slår upp portarna",
    body:
      "Varje runda ger dig trollsilver att spara, vinst som förlust. I Förrådet " +
      "köper du nya torn och varaktiga förstärkningar som följer med dig natt efter natt.",
  },
  {
    id: "hub-redesign",
    when: "Tidigare",
    title: "Boet fick en ansiktslyftning",
    body:
      "Hemmavid ser du nu nästa karta att ge dig på, hur nära nästa upplåsning " +
      "ligger och hela Förrådet samlat på ett och samma ställe.",
  },
  {
    id: "tales-and-leaderboard",
    when: "Tidigare",
    title: "Sägner att samla, ära att jaga",
    body:
      "Spela för att locka fram gamla sägner ur skogen, och se ditt bästa " +
      "resultat ställas mot andras på topplistan.",
  },
  {
    id: "beginning",
    when: "Från början",
    title: "Vakttornet reser sig",
    body:
      "Den röda stugan vid mörka skogens kant behövde en väktare. Tomten, " +
      "Runstenen och Sollyktan tog plats längs stigen, och de första vättarna " +
      "kom krypande i skymningen.",
  },
];

const en: DagbokEntry[] = [
  {
    id: "targeting",
    when: "Right now",
    title: "Tell your towers who to aim at",
    body:
      "Until now every tower always shot the enemy furthest along. Now you choose: " +
      "front or back of the line, or the one with the most or least health. Select a " +
      "tower and point with the icons, or press T.",
  },
  {
    id: "tower-sight",
    when: "Recently",
    title: "A sharper eye over the towers",
    body:
      "Now you can see in black and white when a tower draws extra strength from a " +
      "neighbour, like the warden tree's roots. Quick keys obey too: U upgrades, S " +
      "sells, and 1 or 2 choose a transformation. The mark on a transformed tower now " +
      "sits neatly on its own tile as well, instead of shadowing the one above.",
  },
  {
    id: "endless-watch",
    when: "Recently",
    title: "The Endless Watch is open",
    body:
      "A new way to play has opened its doors under Alternative Tales. In Endless Watch " +
      "one night reigns with no dawn, and the waves grow wilder until the dark takes you. " +
      "Every watcher stands equal, with no upgrades and every tower to hand. On the " +
      "leaderboard one thing alone counts: how long you held the path.",
  },
  {
    id: "auto-and-bosses",
    when: "Recently",
    title: "Waves on a roll, and bosses to beware",
    body:
      "Tired of waving each wave forward by hand? Switch on Auto up in the bar " +
      "and they roll in on their own. Just never let a true boss reach the " +
      "cottage. That ends the night at once, however many lives you have left.",
  },
  {
    id: "english",
    when: "Recently",
    title: "The tales in a foreign tongue",
    body:
      "Anyone who would sooner read in English can now switch languages up in " +
      "the corner. Same forest, same trolls, different words.",
  },
  {
    id: "forradet",
    when: "Recently",
    title: "The Storeroom opens its doors",
    body:
      "Every run now earns you trollsilver to keep, win or lose. In Förrådet you " +
      "spend it on new towers and lasting upgrades that follow you night after night.",
  },
  {
    id: "hub-redesign",
    when: "Earlier",
    title: "The home den, made over",
    body:
      "Back home you now see the next map to take on, how close the next unlock " +
      "is, and the whole Storeroom gathered in one place.",
  },
  {
    id: "tales-and-leaderboard",
    when: "Earlier",
    title: "Tales to gather, glory to chase",
    body:
      "Play to coax old tales out of the forest, and watch your best score stand " +
      "against others on the leaderboard.",
  },
  {
    id: "beginning",
    when: "From the start",
    title: "The watchtower rises",
    body:
      "The little red cottage at the edge of the dark forest needed a keeper. The " +
      "Tomte, the Runestone and the Sun Lantern took their places along the path, " +
      "and the first vättar came creeping at dusk.",
  },
];

export function dagbokEntries(lang: Lang): DagbokEntry[] {
  return lang === "en" ? en : sv;
}

/** localStorage marker holding the id of the newest entry the player has seen.
 * Ids are language-independent, so the sv array is the canonical source. */
const SEEN_KEY = "vakttornet.dagbok.seen.v1";

function latestDagbokId(): string {
  return sv[0]?.id ?? "";
}

/** True when the newest entry hasn't been seen yet (incl. a first-ever visit,
 * where nothing is stored) — drives the attention dot on the hub icon. */
export function hasUnseenDagbok(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== latestDagbokId();
  } catch {
    return false; // no storage (private mode) → never nag
  }
}

/** Record that the player has now seen up to the newest entry. */
export function markDagbokSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, latestDagbokId());
  } catch {
    // ignore — storage unavailable
  }
}
