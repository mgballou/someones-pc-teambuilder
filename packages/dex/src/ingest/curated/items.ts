/**
 * What every item actually does, in the terms the calculator understands.
 *
 * PokéAPI gives an item a category and a paragraph of English prose. Neither
 * is a multiplier. `type-enhancement` covers Charcoal (1.2x Fire) and Sea
 * Incense (1.2x Water) but says nothing about which type, and `held-items`
 * lumps Life Orb, Eviolite and Soothe Bell together. So the mapping onto
 * `ItemEffect` is written down.
 *
 * The rule for what gets modelled: an item is `utility` when this codebase
 * knows what it does and it does not touch a damage roll; it is `unmodelled`
 * when the calculator would have to account for it and does not. Never
 * `utility` as a shrug — that would be a calculator quietly lying, which is
 * the failure the honesty rules exist to prevent.
 */

import type { PokemonType } from '@spc/core'

/** 1.2x to one type. Held items and Arceus plates behave identically here. */
export const TYPE_BOOST_ITEMS: Readonly<Record<string, PokemonType>> = {
  'black-belt': 'fighting',
  'black-glasses': 'dark',
  charcoal: 'fire',
  'dragon-fang': 'dragon',
  'fairy-feather': 'fairy',
  'hard-stone': 'rock',
  magnet: 'electric',
  'metal-coat': 'steel',
  'miracle-seed': 'grass',
  'mystic-water': 'water',
  'never-melt-ice': 'ice',
  'odd-incense': 'psychic',
  'poison-barb': 'poison',
  'rock-incense': 'rock',
  'rose-incense': 'grass',
  'sea-incense': 'water',
  'sharp-beak': 'flying',
  'silk-scarf': 'normal',
  'silver-powder': 'bug',
  'soft-sand': 'ground',
  'spell-tag': 'ghost',
  'twisted-spoon': 'psychic',
  'wave-incense': 'water',

  'draco-plate': 'dragon',
  'dread-plate': 'dark',
  'earth-plate': 'ground',
  'fist-plate': 'fighting',
  'flame-plate': 'fire',
  'icicle-plate': 'ice',
  'insect-plate': 'bug',
  'iron-plate': 'steel',
  'meadow-plate': 'grass',
  'mind-plate': 'psychic',
  'pixie-plate': 'fairy',
  'sky-plate': 'flying',
  'splash-plate': 'water',
  'spooky-plate': 'ghost',
  'stone-plate': 'rock',
  'toxic-plate': 'poison',
  'zap-plate': 'electric',
}

/** Berries that take one super-effective hit at half damage. */
export const RESIST_BERRY_ITEMS: Readonly<Record<string, PokemonType>> = {
  'babiri-berry': 'steel',
  'charti-berry': 'rock',
  'chilan-berry': 'normal',
  'chople-berry': 'fighting',
  'coba-berry': 'flying',
  'colbur-berry': 'dark',
  'haban-berry': 'dragon',
  'kasib-berry': 'ghost',
  'kebia-berry': 'poison',
  'occa-berry': 'fire',
  'passho-berry': 'water',
  'payapa-berry': 'psychic',
  'rindo-berry': 'grass',
  'roseli-berry': 'fairy',
  'shuca-berry': 'ground',
  'tanga-berry': 'bug',
  'wacan-berry': 'electric',
  'yache-berry': 'ice',
}

export type MegaStone = {
  /** The `pokemon` name that may hold the stone. */
  readonly holder: string
  /** The `pokemon` name it becomes. */
  readonly into: string
}

/**
 * Stone to form, written out rather than derived.
 *
 * The naming is close enough to tempt you — `garchompite` really is Garchomp —
 * and then Blastoisinite, Sablenite, Heracronite, Scraftinite, Starminite and
 * Dragoninite all break whatever prefix rule you wrote. A table of eighty-odd
 * pairs is dull and correct; the rule is clever and wrong six times.
 *
 * Includes the Legends: Z-A stones, which PokéAPI now carries.
 */
export const MEGA_STONES: Readonly<Record<string, MegaStone>> = {
  abomasite: { holder: 'abomasnow', into: 'abomasnow-mega' },
  absolite: { holder: 'absol', into: 'absol-mega' },
  'absolite-z': { holder: 'absol', into: 'absol-mega-z' },
  aerodactylite: { holder: 'aerodactyl', into: 'aerodactyl-mega' },
  aggronite: { holder: 'aggron', into: 'aggron-mega' },
  alakazite: { holder: 'alakazam', into: 'alakazam-mega' },
  altarianite: { holder: 'altaria', into: 'altaria-mega' },
  ampharosite: { holder: 'ampharos', into: 'ampharos-mega' },
  audinite: { holder: 'audino', into: 'audino-mega' },
  banettite: { holder: 'banette', into: 'banette-mega' },
  barbaracite: { holder: 'barbaracle', into: 'barbaracle-mega' },
  baxcalibrite: { holder: 'baxcalibur', into: 'baxcalibur-mega' },
  beedrillite: { holder: 'beedrill', into: 'beedrill-mega' },
  blastoisinite: { holder: 'blastoise', into: 'blastoise-mega' },
  blazikenite: { holder: 'blaziken', into: 'blaziken-mega' },
  cameruptite: { holder: 'camerupt', into: 'camerupt-mega' },
  chandelurite: { holder: 'chandelure', into: 'chandelure-mega' },
  'charizardite-x': { holder: 'charizard', into: 'charizard-mega-x' },
  'charizardite-y': { holder: 'charizard', into: 'charizard-mega-y' },
  chesnaughtite: { holder: 'chesnaught', into: 'chesnaught-mega' },
  chimechite: { holder: 'chimecho', into: 'chimecho-mega' },
  clefablite: { holder: 'clefable', into: 'clefable-mega' },
  crabominite: { holder: 'crabominable', into: 'crabominable-mega' },
  darkranite: { holder: 'darkrai', into: 'darkrai-mega' },
  delphoxite: { holder: 'delphox', into: 'delphox-mega' },
  diancite: { holder: 'diancie', into: 'diancie-mega' },
  dragalgite: { holder: 'dragalge', into: 'dragalge-mega' },
  dragoninite: { holder: 'dragonite', into: 'dragonite-mega' },
  drampanite: { holder: 'drampa', into: 'drampa-mega' },
  eelektrossite: { holder: 'eelektross', into: 'eelektross-mega' },
  emboarite: { holder: 'emboar', into: 'emboar-mega' },
  excadrite: { holder: 'excadrill', into: 'excadrill-mega' },
  falinksite: { holder: 'falinks', into: 'falinks-mega' },
  feraligite: { holder: 'feraligatr', into: 'feraligatr-mega' },
  floettite: { holder: 'floette', into: 'floette-mega' },
  froslassite: { holder: 'froslass', into: 'froslass-mega' },
  galladite: { holder: 'gallade', into: 'gallade-mega' },
  garchompite: { holder: 'garchomp', into: 'garchomp-mega' },
  'garchompite-z': { holder: 'garchomp', into: 'garchomp-mega-z' },
  gardevoirite: { holder: 'gardevoir', into: 'gardevoir-mega' },
  gengarite: { holder: 'gengar', into: 'gengar-mega' },
  glalitite: { holder: 'glalie', into: 'glalie-mega' },
  glimmoranite: { holder: 'glimmora', into: 'glimmora-mega' },
  golisopite: { holder: 'golisopod', into: 'golisopod-mega' },
  golurkite: { holder: 'golurk', into: 'golurk-mega' },
  greninjite: { holder: 'greninja', into: 'greninja-mega' },
  gyaradosite: { holder: 'gyarados', into: 'gyarados-mega' },
  hawluchanite: { holder: 'hawlucha', into: 'hawlucha-mega' },
  heatranite: { holder: 'heatran', into: 'heatran-mega' },
  heracronite: { holder: 'heracross', into: 'heracross-mega' },
  houndoominite: { holder: 'houndoom', into: 'houndoom-mega' },
  kangaskhanite: { holder: 'kangaskhan', into: 'kangaskhan-mega' },
  latiasite: { holder: 'latias', into: 'latias-mega' },
  latiosite: { holder: 'latios', into: 'latios-mega' },
  lopunnite: { holder: 'lopunny', into: 'lopunny-mega' },
  lucarionite: { holder: 'lucario', into: 'lucario-mega' },
  'lucarionite-z': { holder: 'lucario', into: 'lucario-mega-z' },
  magearnite: { holder: 'magearna', into: 'magearna-mega' },
  malamarite: { holder: 'malamar', into: 'malamar-mega' },
  manectite: { holder: 'manectric', into: 'manectric-mega' },
  mawilite: { holder: 'mawile', into: 'mawile-mega' },
  meganiumite: { holder: 'meganium', into: 'meganium-mega' },
  medichamite: { holder: 'medicham', into: 'medicham-mega' },
  meowsticite: { holder: 'meowstic-male', into: 'meowstic-male-mega' },
  metagrossite: { holder: 'metagross', into: 'metagross-mega' },
  'mewtwonite-x': { holder: 'mewtwo', into: 'mewtwo-mega-x' },
  'mewtwonite-y': { holder: 'mewtwo', into: 'mewtwo-mega-y' },
  pidgeotite: { holder: 'pidgeot', into: 'pidgeot-mega' },
  pinsirite: { holder: 'pinsir', into: 'pinsir-mega' },
  pyroarite: { holder: 'pyroar', into: 'pyroar-mega' },
  'raichunite-x': { holder: 'raichu', into: 'raichu-mega-x' },
  'raichunite-y': { holder: 'raichu', into: 'raichu-mega-y' },
  sablenite: { holder: 'sableye', into: 'sableye-mega' },
  salamencite: { holder: 'salamence', into: 'salamence-mega' },
  sceptilite: { holder: 'sceptile', into: 'sceptile-mega' },
  scizorite: { holder: 'scizor', into: 'scizor-mega' },
  scolipite: { holder: 'scolipede', into: 'scolipede-mega' },
  scovillainite: { holder: 'scovillain', into: 'scovillain-mega' },
  scraftinite: { holder: 'scrafty', into: 'scrafty-mega' },
  sharpedonite: { holder: 'sharpedo', into: 'sharpedo-mega' },
  skarmorite: { holder: 'skarmory', into: 'skarmory-mega' },
  slowbronite: { holder: 'slowbro', into: 'slowbro-mega' },
  staraptite: { holder: 'staraptor', into: 'staraptor-mega' },
  starminite: { holder: 'starmie', into: 'starmie-mega' },
  steelixite: { holder: 'steelix', into: 'steelix-mega' },
  swampertite: { holder: 'swampert', into: 'swampert-mega' },
  tatsugirinite: { holder: 'tatsugiri-curly', into: 'tatsugiri-curly-mega' },
  tyranitarite: { holder: 'tyranitar', into: 'tyranitar-mega' },
  venusaurite: { holder: 'venusaur', into: 'venusaur-mega' },
  victreebelite: { holder: 'victreebel', into: 'victreebel-mega' },
  zeraorite: { holder: 'zeraora', into: 'zeraora-mega' },
  zygardite: { holder: 'zygarde', into: 'zygarde-mega' },
}

export type SignatureItem = {
  readonly note: string
  /** `pokemon` names the item is locked to. */
  readonly holders: readonly string[]
}

/** Items that change one species' form or typing, and only that species'. */
export const SIGNATURE_ITEMS: Readonly<Record<string, SignatureItem>> = {
  'wellspring-mask': {
    note: 'Turns Ogerpon Water and changes its Embody Aspect boost.',
    holders: ['ogerpon-wellspring-mask'],
  },
  'hearthflame-mask': {
    note: 'Turns Ogerpon Fire and changes its Embody Aspect boost.',
    holders: ['ogerpon-hearthflame-mask'],
  },
  'cornerstone-mask': {
    note: 'Turns Ogerpon Rock and changes its Embody Aspect boost.',
    holders: ['ogerpon-cornerstone-mask'],
  },
  'rusted-sword': {
    note: 'Turns Zacian into its Crowned Sword form.',
    holders: ['zacian', 'zacian-crowned'],
  },
  'rusted-shield': {
    note: 'Turns Zamazenta into its Crowned Shield form.',
    holders: ['zamazenta', 'zamazenta-crowned'],
  },
  'red-orb': { note: 'Turns Groudon Primal.', holders: ['groudon'] },
  'blue-orb': { note: 'Turns Kyogre Primal.', holders: ['kyogre'] },
  'douse-drive': { note: 'Turns Genesect Water and changes Techno Blast.', holders: ['genesect'] },
  'shock-drive': {
    note: 'Turns Genesect Electric and changes Techno Blast.',
    holders: ['genesect'],
  },
  'burn-drive': { note: 'Turns Genesect Fire and changes Techno Blast.', holders: ['genesect'] },
  'chill-drive': { note: 'Turns Genesect Ice and changes Techno Blast.', holders: ['genesect'] },
}

/**
 * The rest of the modelled effects, keyed by item name.
 *
 * Anything not here, not a type boost, not a resist berry, not a mega stone
 * and not a signature item becomes `{ kind: 'unmodelled' }` and stays in the
 * dataset. Nothing is ever dropped.
 */
export type CuratedEffect =
  | { readonly kind: 'choice'; readonly stat: 'atk' | 'spa' | 'spe' }
  | { readonly kind: 'life-orb' }
  | { readonly kind: 'expert-belt' }
  | { readonly kind: 'category-boost'; readonly category: 'physical' | 'special' }
  | { readonly kind: 'assault-vest' }
  | { readonly kind: 'eviolite' }
  | { readonly kind: 'booster-energy' }
  | { readonly kind: 'recovery'; readonly fraction: number }
  | { readonly kind: 'utility' }

export const CURATED_ITEM_EFFECTS: Readonly<Record<string, CuratedEffect>> = {
  'choice-band': { kind: 'choice', stat: 'atk' },
  'choice-specs': { kind: 'choice', stat: 'spa' },
  'choice-scarf': { kind: 'choice', stat: 'spe' },

  'life-orb': { kind: 'life-orb' },
  'expert-belt': { kind: 'expert-belt' },
  'muscle-band': { kind: 'category-boost', category: 'physical' },
  'wise-glasses': { kind: 'category-boost', category: 'special' },
  'assault-vest': { kind: 'assault-vest' },
  eviolite: { kind: 'eviolite' },
  'booster-energy': { kind: 'booster-energy' },

  leftovers: { kind: 'recovery', fraction: 1 / 16 },
  'black-sludge': { kind: 'recovery', fraction: 1 / 16 },
  'sitrus-berry': { kind: 'recovery', fraction: 0.25 },
  'figy-berry': { kind: 'recovery', fraction: 1 / 3 },
  'wiki-berry': { kind: 'recovery', fraction: 1 / 3 },
  'mago-berry': { kind: 'recovery', fraction: 1 / 3 },
  'aguav-berry': { kind: 'recovery', fraction: 1 / 3 },
  'iapapa-berry': { kind: 'recovery', fraction: 1 / 3 },

  // Known, and outside the damage chain.
  'ability-shield': { kind: 'utility' },
  'absorb-bulb': { kind: 'utility' },
  'adrenaline-orb': { kind: 'utility' },
  'air-balloon': { kind: 'utility' },
  'big-root': { kind: 'utility' },
  'binding-band': { kind: 'utility' },
  'blunder-policy': { kind: 'utility' },
  'bright-powder': { kind: 'utility' },
  'cell-battery': { kind: 'utility' },
  'clear-amulet': { kind: 'utility' },
  'covert-cloak': { kind: 'utility' },
  'damp-rock': { kind: 'utility' },
  'destiny-knot': { kind: 'utility' },
  'eject-button': { kind: 'utility' },
  'eject-pack': { kind: 'utility' },
  everstone: { kind: 'utility' },
  'flame-orb': { kind: 'utility' },
  'float-stone': { kind: 'utility' },
  'focus-band': { kind: 'utility' },
  'focus-sash': { kind: 'utility' },
  'grassy-seed': { kind: 'utility' },
  'grip-claw': { kind: 'utility' },
  'heat-rock': { kind: 'utility' },
  'heavy-duty-boots': { kind: 'utility' },
  'icy-rock': { kind: 'utility' },
  'iron-ball': { kind: 'utility' },
  'kings-rock': { kind: 'utility' },
  'lagging-tail': { kind: 'utility' },
  'lax-incense': { kind: 'utility' },
  'light-clay': { kind: 'utility' },
  'luminous-moss': { kind: 'utility' },
  'mental-herb': { kind: 'utility' },
  'mirror-herb': { kind: 'utility' },
  'misty-seed': { kind: 'utility' },
  'power-herb': { kind: 'utility' },
  'protective-pads': { kind: 'utility' },
  'psychic-seed': { kind: 'utility' },
  'quick-claw': { kind: 'utility' },
  'razor-fang': { kind: 'utility' },
  'red-card': { kind: 'utility' },
  'ring-target': { kind: 'utility' },
  'rocky-helmet': { kind: 'utility' },
  'room-service': { kind: 'utility' },
  'safety-goggles': { kind: 'utility' },
  'shed-shell': { kind: 'utility' },
  'shell-bell': { kind: 'utility' },
  'smoke-ball': { kind: 'utility' },
  'smooth-rock': { kind: 'utility' },
  snowball: { kind: 'utility' },
  'sticky-barb': { kind: 'utility' },
  'terrain-extender': { kind: 'utility' },
  'throat-spray': { kind: 'utility' },
  'toxic-orb': { kind: 'utility' },
  'utility-umbrella': { kind: 'utility' },
  'weakness-policy': { kind: 'utility' },
  'white-herb': { kind: 'utility' },
  'wide-lens': { kind: 'utility' },
  'zoom-lens': { kind: 'utility' },
  'electric-seed': { kind: 'utility' },
}
