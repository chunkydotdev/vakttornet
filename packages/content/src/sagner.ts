import type { SagenDef } from "./schema";

/**
 * Sägner — folklore codex entries, unlocked by deeds. The app evaluates
 * conditions against lifetime counters in the save; we only declare them.
 * Tone: sagoton, as if retold at the fireside in the röda stugan.
 */
export const sagner: SagenDef[] = [
  {
    id: "trollet-i-skogen",
    title: "Trollet i skogen",
    text:
      "Det sägs att det första trollet som föll vid vakttornet var äldre än granarna det gömde sig bland. " +
      "När det störtade omkull skalv hela mörka skogen, och i den röda stugan slutade vaggan att gunga ett ögonblick. " +
      "Sedan den kvällen vet trollen att ljuset i tornet inte går att skrämma.",
    condition: { kind: "kills", enemyTypeId: "troll", count: 1 },
  },
  {
    id: "vattarnas-natt",
    title: "Vättarnas natt",
    text:
      "Det sägs att vättarna räknar sina fallna i femtiotal, för längre än så når inte deras små fingrar. " +
      "Femtio små gravar under trädens rötter, femtio små mössor som ingen längre bär. " +
      "Ändå kommer de igen, natt efter natt — för en vätte glömmer allt utom vägen hem.",
    condition: { kind: "kills", enemyTypeId: "vatte", count: 50 },
  },
  {
    id: "mylingarnas-vila",
    title: "Mylingarnas vila",
    text:
      "Det sägs att en myling inte kan dö, bara somna om — och att den som stillar tjugofem av dem har sjungit en hel kyrkogård till ro. " +
      "De ropar inte längre vid din dörr om nätterna. " +
      "Lyssnar du noga hör du dem ändå, som ett tack buret på vinden över myren.",
    condition: { kind: "kills", enemyTypeId: "myling", count: 25 },
  },
  {
    id: "sten-vid-grynings-rand",
    title: "Sten vid gryningens rand",
    text:
      "Det sägs att solens fångna ljus biter hårdare än någon klinga, för det som förstenas hinner ångra sig innan det hårdnar. " +
      "Trettio väsen står nu stilla längs stigarna, gråa och tysta, med mossan långsamt växande över axlarna. " +
      "Vandrare lägger en slant på deras fötter — för säkerhets skull.",
    condition: { kind: "petrified", count: 30 },
  },
  {
    id: "glantans-vaktare",
    title: "Gläntans väktare",
    text:
      "Det sägs att gläntan en gång var skogens mörkaste rum, där inget vågade slå rot. " +
      "Nu står tornet där, och gräset växer grönt ända fram till stugbron. " +
      "Den som höll gläntan en hel natt kallas väktare, och det namnet nöts aldrig bort.",
    condition: { kind: "winLevel", levelId: "level01" },
  },
  {
    id: "trollstigens-slut",
    title: "Trollstigens slut",
    text:
      "Det sägs att trollstigen trampades upp av tusen tunga fötter på väg mot stugan, och att ingen trodde den kunde stängas. " +
      "Men en natt vände fotspåren — alla på en gång, bort mot bergen. " +
      "Sedan dess växer det smultron mitt på stigen, och trollen tar hellre den långa vägen runt.",
    condition: { kind: "winLevel", levelId: "level02" },
  },
  {
    id: "obeflackad",
    title: "Obefläckad",
    text:
      "Det sägs att det finns nätter då inte ett enda väsen når fram till stugans grind — då varje liv i den röda stugan är lika helt i gryningen som i skymningen. " +
      "Om sådana nätter sjunger man tyst, för de är för fina att slita på. " +
      "Näcken själv lär ha lagt ner fiolen och lyssnat.",
    condition: { kind: "flawlessWin" },
  },
  {
    id: "vattekungens-fall",
    title: "Vättekungens fall",
    text:
      "Det sägs att vättarnas kung bar en krona av stulet guld, och att den var tyngre än hans lilla hjärta. " +
      "När han föll vid tornet rullade kronan ner i mossan, och ingen vätte har vågat lyfta den sedan dess. " +
      "Där den ligger växer nu gula blommor som inte finns någon annanstans i hela mörka skogen.",
    condition: { kind: "kills", enemyTypeId: "vattekungen", count: 1 },
  },
  {
    id: "trollmoderns-sista-vagga",
    title: "Trollmoderns sista vagga",
    text:
      "Det sägs att Trollmodern var äldre än berget hon sov under, och att björken på hennes rygg grott ur ett frö från tidernas första vår. " +
      "När hon till sist lade sig ner vid stigen blev hon en kulle bland kullarna, och björken växer där än. " +
      "Om våren vitnar den av blom, och då säger de gamla att hon vaggar ännu.",
    condition: { kind: "kills", enemyTypeId: "trollmodern", count: 1 },
  },
  {
    id: "sjoraet-stiger",
    title: "Sjörået stiger",
    text:
      "Det sägs att tjärnen är bottenlös, och att Sjörået steg ur den en natt för att bära ljuset i tornet hem till mörkret. " +
      "Men ljus låter sig inte bäras under vatten, och i gryningen var hon bara dimma över vassen. " +
      "Den som ror över tjärnen håller ändå handen om sin lykta — för säkerhets skull.",
    condition: { kind: "kills", enemyTypeId: "sjoraet", count: 1 },
  },
];
