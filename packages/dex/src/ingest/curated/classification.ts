/**
 * The parts of a species' standing that PokéAPI cannot tell you.
 *
 * `/pokemon-species` carries exactly two bits: `is_legendary` and
 * `is_mythical`. It has no idea what a Paradox Pokémon is, no idea what an
 * Ultra Beast is, and no idea which legendaries a VGC regulation calls
 * *restricted* — that last one is the whole reason Regulation G is a different
 * format from Regulation H. All three are facts about the games, stable across
 * dataset rebuilds, so they are written down rather than guessed at.
 *
 * Keys are `pokemon-species` names, which every form of a species shares.
 */

/**
 * Paradox Pokémon: the ancient and future forms from Scarlet and Violet and
 * its two expansions. PokéAPI marks all of them `is_legendary: false`.
 */
export const PARADOX_SPECIES: ReadonlySet<string> = new Set([
  'great-tusk',
  'scream-tail',
  'brute-bonnet',
  'flutter-mane',
  'slither-wing',
  'sandy-shocks',
  'roaring-moon',
  'walking-wake',
  'gouging-fire',
  'raging-bolt',
  'iron-treads',
  'iron-bundle',
  'iron-hands',
  'iron-jugulis',
  'iron-moth',
  'iron-thorns',
  'iron-valiant',
  'iron-leaves',
  'iron-boulder',
  'iron-crown',
])

/** Ultra Beasts, from Sun and Moon. Also unflagged by PokéAPI. */
export const ULTRA_BEAST_SPECIES: ReadonlySet<string> = new Set([
  'nihilego',
  'buzzwole',
  'pheromosa',
  'xurkitree',
  'celesteela',
  'kartana',
  'guzzlord',
  'poipole',
  'naganadel',
  'stakataka',
  'blacephalon',
])

/**
 * Restricted legendaries — the box-art tier that VGC caps rather than bans.
 *
 * This is the list Regulation G allows two of. It is a competitive convention,
 * not a fact PokéAPI models, so a format that wants a different cut declares
 * its own `restrictedSpecies`; this only records the usual meaning.
 */
export const RESTRICTED_SPECIES: ReadonlySet<string> = new Set([
  'mewtwo',
  'lugia',
  'ho-oh',
  'kyogre',
  'groudon',
  'rayquaza',
  'dialga',
  'palkia',
  'giratina',
  'reshiram',
  'zekrom',
  'kyurem',
  'xerneas',
  'yveltal',
  'zygarde',
  'cosmog',
  'cosmoem',
  'solgaleo',
  'lunala',
  'necrozma',
  'zacian',
  'zamazenta',
  'eternatus',
  'calyrex',
  'koraidon',
  'miraidon',
  'terapagos',
])

/**
 * Legendaries the scene treats as sub-legendary: strong, but never restricted.
 *
 * PokéAPI's single `is_legendary` bit covers Landorus and Rayquaza alike.
 * Anything flagged legendary and named here becomes `sub-legendary`; anything
 * flagged legendary and not named here stays `legendary`.
 */
export const SUB_LEGENDARY_SPECIES: ReadonlySet<string> = new Set([
  'articuno',
  'zapdos',
  'moltres',
  'raikou',
  'entei',
  'suicune',
  'regirock',
  'regice',
  'registeel',
  'latias',
  'latios',
  'uxie',
  'mesprit',
  'azelf',
  'heatran',
  'regigigas',
  'cresselia',
  'cobalion',
  'terrakion',
  'virizion',
  'tornadus',
  'thundurus',
  'landorus',
  'enamorus',
  'type-null',
  'silvally',
  'tapu-koko',
  'tapu-lele',
  'tapu-bulu',
  'tapu-fini',
  'kubfu',
  'urshifu',
  'regieleki',
  'regidrago',
  'glastrier',
  'spectrier',
  'wo-chien',
  'chien-pao',
  'ting-lu',
  'chi-yu',
  'okidogi',
  'munkidori',
  'fezandipiti',
  'ogerpon',
])
