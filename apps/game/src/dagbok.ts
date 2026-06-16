/**
 * Tornets dagbok — the watchtower-keeper's diary. A player-facing, in-world
 * changelog: each real change to the game retold as a cozy note from the
 * keeper, newest first. Deliberately non-technical (no version numbers, no
 * jargon) and on-theme (sagoton). Adding an entry = prepend to BOTH arrays.
 *
 * This is pure presentation copy, not game data — it never touches the sim or
 * content schema, so it lives in the app and is swapped by language like the
 * rest of the UI strings (see i18n.ts / localized.ts).
 */
import type { Lang } from "./i18n";

export interface DagbokEntry {
  /** soft, non-technical time label ("Just nu", "Nyligen", …) */
  when: string;
  title: string;
  body: string;
}

const sv: DagbokEntry[] = [
  {
    when: "Just nu",
    title: "Vågor på rad, och bjässar att akta sig för",
    body:
      "Trött på att vinka fram varje våg för hand? Slå på Auto uppe i fältet, " +
      "så rullar de in av sig själva. Men släpp aldrig en riktig bjässe ända " +
      "fram till stugan. Då är natten slut på direkten, hur många liv du än har kvar.",
  },
  {
    when: "Nyligen",
    title: "Sägnerna på främmande tunga",
    body:
      "Den som hellre läser på engelska kan numera byta språk uppe i hörnet. " +
      "Samma skog, samma troll, andra ord.",
  },
  {
    when: "Nyligen",
    title: "Förrådet slår upp portarna",
    body:
      "Varje runda ger dig trollsilver att spara, vinst som förlust. I Förrådet " +
      "köper du nya torn och varaktiga förstärkningar som följer med dig natt efter natt.",
  },
  {
    when: "Tidigare",
    title: "Boet fick en ansiktslyftning",
    body:
      "Hemmavid ser du nu nästa karta att ge dig på, hur nära nästa upplåsning " +
      "ligger och hela Förrådet samlat på ett och samma ställe.",
  },
  {
    when: "Tidigare",
    title: "Sägner att samla, ära att jaga",
    body:
      "Spela för att locka fram gamla sägner ur skogen, och se ditt bästa " +
      "resultat ställas mot andras på topplistan.",
  },
  {
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
    when: "Right now",
    title: "Waves on a roll, and bosses to beware",
    body:
      "Tired of waving each wave forward by hand? Switch on Auto up in the bar " +
      "and they roll in on their own. Just never let a true boss reach the " +
      "cottage. That ends the night at once, however many lives you have left.",
  },
  {
    when: "Recently",
    title: "The tales in a foreign tongue",
    body:
      "Anyone who would sooner read in English can now switch languages up in " +
      "the corner. Same forest, same trolls, different words.",
  },
  {
    when: "Recently",
    title: "The Storeroom opens its doors",
    body:
      "Every run now earns you trollsilver to keep, win or lose. In Förrådet you " +
      "spend it on new towers and lasting upgrades that follow you night after night.",
  },
  {
    when: "Earlier",
    title: "The home den, made over",
    body:
      "Back home you now see the next map to take on, how close the next unlock " +
      "is, and the whole Storeroom gathered in one place.",
  },
  {
    when: "Earlier",
    title: "Tales to gather, glory to chase",
    body:
      "Play to coax old tales out of the forest, and watch your best score stand " +
      "against others on the leaderboard.",
  },
  {
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
