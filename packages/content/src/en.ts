import type { ContentTranslation } from "./i18n-types";

/**
 * English overlay. Swedish is canonical; this file carries the same
 * fireside register into English. Folklore beings keep their Swedish
 * names (Näcken, Vätte, Myling, Skogsrået...), and where a name needs
 * decoding, the surrounding prose does it quietly. The sagner mirror
 * the Swedish discipline: same openings ("They say that..." wherever
 * the Swedish opens "Det sägs att"), same sentence shapes, and the
 * em dash stays as rare here as it is in the source.
 */
export const en: ContentTranslation = {
  towers: {
    tomte: {
      name: "The Tomte",
      description:
        "Small he is, swift and easily riled, and he flings hot Yule porridge at whatever threatens the farmstead.",
      mutations: {
        tomtetvillingarna: {
          name: "The Tomte Twins",
          description:
            "It turns out the tomte was two all along, and now the brothers fling porridge at one creature apiece.",
        },
        argbigga: {
          name: "Crosspatch",
          description:
            "No one has ever seen the tomte so furious as now, when the porridge ladle whirls faster than the eye can follow.",
        },
      },
    },
    runsten: {
      name: "The Runestone",
      description:
        "When the ancient runes glow to life, lightning leaps from the stone and burns every creature that dares come near.",
      mutations: {
        askstenen: {
          name: "The Thunderstone",
          description:
            "The stone remembers the thunder god's hand: every bolt strikes heavier, but the runes need longer to glow.",
        },
        offerstenen: {
          name: "The Sacrifice Stone",
          description:
            "Old customs demand their due, so every creature that falls beside the stone leaves richer gifts of gold.",
        },
      },
    },
    sollykta: {
      name: "The Sun Lantern",
      description:
        "The lantern carries captured sunlight far across the forest, and any creature it touches stiffens to stone mid-stride.",
      mutations: {
        midnattssol: {
          name: "Midnight Sun",
          description:
            "Never again will the lantern go out, and a still midnight light rests over the forest, weighing down every step beneath it.",
        },
        brannglas: {
          name: "Burning Glass",
          description:
            "A polished lens gathers the sun's heat into a single point, so that whatever it strikes carries the fire onward through the woods.",
        },
      },
    },
    nacken: {
      name: "Näcken",
      description:
        "The näck plays a single note over the water — one creature is lured from the line and drawn beneath the surface.",
      mutations: {
        "djupets-ton": {
          name: "The Deep's Note",
          description:
            "When the note from the deep sounds, the weak are pulled under without a sound, however far they have come.",
        },
        dubbelton: {
          name: "The Double Note",
          description:
            "The näck plays with both hands now, and two creatures follow two different strains out of the stream.",
        },
      },
    },
    vardtradet: {
      name: "The Warden Tree",
      description:
        "The old tree by the cottage corner never fights, but whoever tends it is given gifts of gold after every wave laid to rest.",
      mutations: {
        "gyllene-lov": {
          name: "Golden Leaves",
          description:
            "Whoever has tended the tree well reaps richer than anyone when the autumn leaves fall as pure gold.",
        },
        rotverk: {
          name: "Rootwork",
          description:
            "The tree's roots find their way to the towers around it and lend them the ancient strength of the forest.",
        },
      },
    },
  },
  enemies: {
    myling: { name: "Myling" },
    vatte: { name: "Vätte" },
    troll: { name: "Troll" },
    skuggvarg: { name: "Shadow Wolf" },
    kyrkogrim: { name: "Kyrkogrim" },
    backahast: { name: "Bäckahästen" },
    stentroll: { name: "Stone Troll" },
    trollyngel: { name: "Troll Spawn" },
    skattvatte: { name: "Treasure Vätte" },
    vattekungen: { name: "Vättekungen" },
    trollmodern: { name: "Trollmodern" },
    sjoraet: { name: "Sjörået" },
    gruvkungen: { name: "Gruvkungen" },
    isfursten: { name: "Isfursten" },
    skogsraet: { name: "Skogsrået" },
  },
  levels: {
    level01: { name: "The Glade" },
    level02: { name: "The Troll Trail" },
    level03: { name: "Näcken's Tarn" },
    level04: { name: "The Charcoal Kiln" },
    level05: { name: "The Brook Ravine" },
    level06: { name: "The Mine Gallery" },
    level07: { name: "The River Delta" },
    level08: { name: "The Winter Night" },
    level09: { name: "The Old Forest" },
  },
  metaUpgrades: {
    bjornstyrka: {
      name: "Bear Strength",
      description:
        "With the bear's might in the timber, every tower strikes 10% harder.",
    },
    ugglesyn: {
      name: "Owl Sight",
      description:
        "Every tower sees 10% farther, for the owl in the spruce misses nothing.",
    },
    skattkista: {
      name: "Treasure Chest",
      description:
        "Old trollsilver, newly polished: begin every defense with +40 gold.",
    },
    stugvarme: {
      name: "Hearthwarmth",
      description:
        "The fire is burning and courage holds, so every defense begins with +2 lives.",
    },
  },
  sagner: {
    "trollet-i-skogen": {
      title: "The Troll in the Forest",
      text:
        "They say that the first troll to fall at the watchtower was older than the spruces it hid among. " +
        "When it came crashing down the whole dark forest shook, and in the red cottage the cradle stopped rocking for a moment. " +
        "Since that evening the trolls have known that the light in the tower cannot be frightened.",
    },
    "vattarnas-natt": {
      title: "The Night of the Vättar",
      text:
        "Fifty small graves under the roots of the trees, fifty small caps that no one wears anymore: the vättar count their fallen in fifties, for their little fingers reach no further than that. " +
        "Still they come again, night after night, for a vätte forgets everything except the way home.",
    },
    "mylingarnas-vila": {
      title: "The Mylings' Rest",
      text:
        "Can a myling die? " +
        "No, say the old folk, it can only fall back asleep, and whoever stills twenty-five of them has sung a whole churchyard to rest. " +
        "They no longer cry at your door in the night. " +
        "Listen closely and you will hear them still, like a thank-you carried on the wind across the mire.",
    },
    "sten-vid-grynings-rand": {
      title: "Stone at the Edge of Dawn",
      text:
        "Never laugh at the grey figures along the paths, however still they stand with the moss growing slowly over their shoulders. " +
        "The sun's captive light bites harder than any blade, for what turns to stone has time to repent before it hardens. " +
        "Thirty creatures now stand halted mid-stride, and wanderers lay a coin at their feet.",
    },
    "glantans-vaktare": {
      title: "The Keeper of the Glade",
      text:
        "The glade was once the darkest room in the forest, where nothing dared take root. " +
        "Now the tower stands there, and the grass grows green all the way to the cottage steps. " +
        "Whoever held the glade through a whole night is called a keeper. " +
        "That name never wears away.",
    },
    "trollstigens-slut": {
      title: "The End of the Troll Trail",
      text:
        "They say that the troll trail was trodden out by a thousand heavy feet on their way to the cottage, and that no one believed it could be closed. " +
        "Then one night the footprints turned — all at once, away toward the mountains. " +
        "Since then wild strawberries grow in the middle of the trail, and the trolls would rather take the long way around.",
    },
    obeflackad: {
      title: "Unblemished",
      text:
        "They say that there are nights when not a single creature reaches the cottage gate, nights when every life in the red cottage is as whole at dawn as it was at dusk. " +
        "Of such nights one sings quietly, for they are too fine to wear out. " +
        "Näcken himself is said to have laid down his fiddle and listened.",
    },
    "vattekungens-fall": {
      title: "The Fall of Vättekungen",
      text: "Heavy was the vätte king's crown of stolen gold, heavier than his little heart, and where it rolled into the moss when he fell it lies there still, for no vätte has dared to lift it, and all around it grow yellow flowers that are found nowhere else in the whole dark forest.",
    },
    "trollmoderns-sista-vagga": {
      title: "Trollmodern's Last Cradle",
      text:
        "“She is rocking still,” say the old folk in spring, when the birch turns white with blossom. " +
        "The troll mother was older than the mountain she slept beneath, and the birch on her back had sprouted from a seed of time's first spring. " +
        "When at last she lay down beside the path, she became one hill among the hills. " +
        "The birch grows there yet.",
    },
    "sjoraet-stiger": {
      title: "Sjörået Rises",
      text:
        "They say that the tarn is bottomless, and that Sjörået rose out of it one night to carry the light in the tower home to the darkness. " +
        "But light will not be carried under water, and by dawn she was only mist above the reeds. " +
        "Whoever rows across the tarn still keeps a hand on their lantern — just in case.",
    },
    "skattvattens-flykt": {
      title: "The Treasure Vätte's Flight",
      text:
        "They say that the treasure vättar carry gold that was never theirs, and that they run as if the sack were on fire. " +
        "Ten sacks have now stopped at the tower, though ten small vättar ran on with nothing left but their caps. " +
        "The gold they roll into the moss at the foot of the cottage. " +
        "Never count it, for counted gold stops growing.",
    },
    "gruvkungens-sista-adra": {
      title: "Gruvkungen's Last Vein",
      text:
        "The same night Gruvkungen fell at the tower, every light in the mine went out at once, all but one, which wandered up out of the shaft and stayed by the cottage. " +
        "He had counted every vein in the mountain as his own, and his crown of pickaxes rang in time with his steps. " +
        "Ore-seekers still lay an ear to the mountain, but the mountain is holding its breath.",
    },
    "isfurstens-tovader": {
      title: "Isfursten's Thaw",
      text:
        "The great thaw, so the old folk call the night when Isfursten's crown of ice broke at the tower and, for the first time in a hundred years, the spruces dripped in the dead of winter. " +
        "He had worn winter like a mantle and laid lake after lake in irons with his breath, but to this day you can hear the brooks laughing at the whole affair.",
    },
    "skogsraet-vander-sig-om": {
      title: "Skogsrået Looks Back",
      text:
        "Fair from the front as a summer evening, hollow in the back like a rotten tree. " +
        "Skogsrået was the forest's own longing. " +
        "At the tower she turned around one last time, and whoever held the lantern dared not watch where she went. " +
        "Since then the old forest stands perfectly still. " +
        "The fox tail shows itself only to those who have stopped looking.",
    },
  },
};
