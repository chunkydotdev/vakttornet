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
      "Femtio små gravar under trädens rötter, femtio små mössor som ingen längre bär: vättarna räknar sina fallna i femtiotal, för längre än så når inte deras små fingrar. " +
      "Ändå kommer de igen, natt efter natt, för en vätte glömmer allt utom vägen hem.",
    condition: { kind: "kills", enemyTypeId: "vatte", count: 50 },
  },
  {
    id: "mylingarnas-vila",
    title: "Mylingarnas vila",
    text:
      "Kan en myling dö? " +
      "Nej, säger de gamla, den kan bara somna om, och den som stillar tjugofem av dem har sjungit en hel kyrkogård till ro. " +
      "De ropar inte längre vid din dörr om nätterna. " +
      "Lyssnar du noga hör du dem ändå, som ett tack buret på vinden över myren.",
    condition: { kind: "kills", enemyTypeId: "myling", count: 25 },
  },
  {
    id: "sten-vid-grynings-rand",
    title: "Sten vid gryningens rand",
    text:
      "Skratta aldrig åt de gråa gestalterna längs stigarna, hur stilla de än står med mossan långsamt växande över axlarna. " +
      "Solens fångna ljus biter hårdare än någon klinga, för det som förstenas hinner ångra sig innan det hårdnar. " +
      "Trettio väsen står nu hejdade mitt i steget, och vandrare lägger en slant på deras fötter.",
    condition: { kind: "petrified", count: 30 },
  },
  {
    id: "glantans-vaktare",
    title: "Gläntans väktare",
    text:
      "Gläntan var en gång skogens mörkaste rum, där inget vågade slå rot. " +
      "Nu står tornet där, och gräset växer grönt ända fram till stugbron. " +
      "Den som höll gläntan en hel natt kallas väktare. " +
      "Det namnet nöts aldrig bort.",
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
      "Det sägs att det finns nätter då inte ett enda väsen når fram till stugans grind, nätter då varje liv i den röda stugan är lika helt i gryningen som i skymningen. " +
      "Om sådana nätter sjunger man tyst, för de är för fina att slita på. " +
      "Näcken själv lär ha lagt ner fiolen och lyssnat.",
    condition: { kind: "flawlessWin" },
  },
  {
    id: "vattekungens-fall",
    title: "Vättekungens fall",
    text:
      "Tung var vättekungens krona av stulet guld, tyngre än hans lilla hjärta, och där den rullade ner i mossan när han föll ligger den kvar, för ingen vätte har vågat lyfta den, och runt omkring växer gula blommor som inte finns någon annanstans i hela mörka skogen.",
    condition: { kind: "kills", enemyTypeId: "vattekungen", count: 1 },
  },
  {
    id: "trollmoderns-sista-vagga",
    title: "Trollmoderns sista vagga",
    text:
      "”Hon vaggar ännu”, säger de gamla om våren, när björken vitnar av blom. " +
      "Trollmodern var äldre än berget hon sov under, och björken på hennes rygg hade grott ur ett frö från tidernas första vår. " +
      "När hon till sist lade sig ner vid stigen blev hon en kulle bland kullarna. " +
      "Björken växer där än.",
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
  {
    id: "skattvattens-flykt",
    title: "Skattvättens flykt",
    text:
      "Det sägs att skattvättarna bär guld som aldrig varit deras, och att de springer som om säcken brann. " +
      "Tio säckar har nu stannat vid tornet, fast tio små vättar sprang vidare med bara mössan i behåll. " +
      "Guldet rullar de in i mossan vid stuggrunden. " +
      "Räkna det aldrig, för räknat guld slutar växa.",
    condition: { kind: "kills", enemyTypeId: "skattvatte", count: 10 },
  },
  {
    id: "gruvkungens-sista-adra",
    title: "Gruvkungens sista ådra",
    text:
      "Samma natt som Gruvkungen föll vid tornet slocknade gruvans alla ljus på en och samma gång, alla utom ett, som vandrade upp ur schaktet och stannade hos stugan. " +
      "Han hade räknat varje åder i berget som sin, och hans krona av hackor klingade i takt med stegen. " +
      "Malmletare lägger än i dag örat mot berget, men berget håller andan.",
    condition: { kind: "kills", enemyTypeId: "gruvkungen", count: 1 },
  },
  {
    id: "isfurstens-tovader",
    title: "Isfurstens töväder",
    text:
      "Det stora tövädret, så kallar de gamla natten då Isfurstens krona av is brast vid tornet och det för första gången på hundra år droppade ur granarna mitt i mörkaste vintern. " +
      "Han hade burit vintern som en mantel och lagt sjö efter sjö i bojor med sin andedräkt, men än i dag hör man bäckarna skratta åt alltihop.",
    condition: { kind: "kills", enemyTypeId: "isfursten", count: 1 },
  },
  {
    id: "skogsraet-vander-sig-om",
    title: "Skogsrået vänder sig om",
    text:
      "Skön framifrån som en sommarkväll, ihålig i ryggen som ett murket träd. " +
      "Skogsrået var skogens egen längtan. " +
      "Vid tornet vände hon sig om en sista gång, och den som höll i lyktan vågade inte se efter vart hon gick. " +
      "Sedan dess står urskogen alldeles stilla. " +
      "Rävsvansen skymtar bara för den som slutat leta.",
    condition: { kind: "kills", enemyTypeId: "skogsraet", count: 1 },
  },
];
