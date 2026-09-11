/**
 * The fixture dex.
 *
 * Every test in `@spc/core` runs against this and never against the built
 * dataset or the network. It is deliberately small — every species is here
 * because it exercises something the calculator or the analysis has to get
 * right — and every value in it is real.
 *
 * Extend it by adding to the tables below. Do not fork it.
 */

import type {
  Ability,
  AbilityId,
  Dex,
  Format,
  FormatId,
  Item,
  ItemId,
  Move,
  MoveCategory,
  MoveFlags,
  MoveId,
  MoveTarget,
  PokemonType,
  Species,
  SpeciesClassification,
  SpeciesId,
  StatSpread,
  VariablePower,
} from '../../src/index'
import { abilityId, EMPTY_LEGALITY, formatId, itemId, moveId, speciesId } from '../../src/index'

const NO_FLAGS: MoveFlags = {
  contact: false,
  sound: false,
  punch: false,
  bite: false,
  slicing: false,
  bullet: false,
  wind: false,
  powder: false,
  pulse: false,
  bypassSubstitute: false,
  protectable: true,
  ignoresDefenseBoosts: false,
  alwaysHits: false,
}

type SpeciesSeed = {
  id: string
  dexNumber: number
  types: readonly PokemonType[]
  baseStats: StatSpread
  abilities: readonly string[]
  hiddenAbility?: string
  weightKg: number
  heightM?: number
  classification?: SpeciesClassification
  canEvolve?: boolean
  formName?: string
  baseSpecies?: string
  /** Defaults to generation IX. Pass `[]` for a form Scarlet and Violet lack. */
  availableIn?: readonly number[]
}

function makeSpecies(seed: SpeciesSeed): Species {
  const id = speciesId(seed.id)
  const types = seed.types as Species['types']
  // `name` is the species, never the form — `displayName` recombines the two.
  // Deriving it from the full id would render Rotom-Wash as "Rotom-Wash-Wash".
  const nameSource = seed.baseSpecies ?? seed.id
  return {
    id,
    name: nameSource
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-'),
    dexNumber: seed.dexNumber,
    baseSpecies: speciesId(seed.baseSpecies ?? seed.id),
    formName: seed.formName ?? null,
    types,
    baseStats: seed.baseStats,
    abilities: seed.abilities.map(abilityId),
    hiddenAbility: seed.hiddenAbility === undefined ? null : abilityId(seed.hiddenAbility),
    weightKg: seed.weightKg,
    heightM: seed.heightM ?? 1,
    generation: 9,
    availableIn: seed.availableIn ?? [9],
    classification: seed.classification ?? 'ordinary',
    canEvolve: seed.canEvolve ?? false,
    gimmicks: { megaStones: [], canGigantamax: false, canTerastallize: true },
    spriteKey: seed.id,
  }
}

const SPECIES: readonly Species[] = [
  makeSpecies({
    id: 'garchomp',
    dexNumber: 445,
    types: ['dragon', 'ground'],
    baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    abilities: ['sand-veil'],
    hiddenAbility: 'rough-skin',
    weightKg: 95,
  }),
  makeSpecies({
    id: 'rotom-wash',
    dexNumber: 479,
    baseSpecies: 'rotom',
    formName: 'Wash',
    types: ['electric', 'water'],
    baseStats: { hp: 50, atk: 65, def: 107, spa: 105, spd: 107, spe: 86 },
    abilities: ['levitate'],
    weightKg: 0.3,
  }),
  makeSpecies({
    id: 'landorus-therian',
    dexNumber: 645,
    baseSpecies: 'landorus',
    formName: 'Therian',
    types: ['ground', 'flying'],
    baseStats: { hp: 89, atk: 145, def: 90, spa: 105, spd: 80, spe: 91 },
    abilities: ['intimidate'],
    weightKg: 68,
    classification: 'sub-legendary',
  }),
  /**
   * Shares dex number 645 with Landorus-Therian on purpose. The Species Clause
   * exists for exactly this case — two different forms of one species — and a
   * fixture that cannot express it tests the wrong thing.
   */
  makeSpecies({
    id: 'landorus-incarnate',
    dexNumber: 645,
    baseSpecies: 'landorus',
    formName: 'Incarnate',
    types: ['ground', 'flying'],
    baseStats: { hp: 89, atk: 125, def: 90, spa: 115, spd: 80, spe: 101 },
    abilities: ['sheer-force'],
    weightKg: 68,
    classification: 'sub-legendary',
  }),
  makeSpecies({
    id: 'incineroar',
    dexNumber: 727,
    types: ['fire', 'dark'],
    baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 },
    abilities: ['blaze'],
    hiddenAbility: 'intimidate',
    weightKg: 83,
  }),
  makeSpecies({
    id: 'flutter-mane',
    dexNumber: 987,
    types: ['ghost', 'fairy'],
    baseStats: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 },
    abilities: ['protosynthesis'],
    weightKg: 4,
    classification: 'paradox',
  }),
  makeSpecies({
    id: 'amoonguss',
    dexNumber: 591,
    types: ['grass', 'poison'],
    baseStats: { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 },
    abilities: ['effect-spore'],
    hiddenAbility: 'regenerator',
    weightKg: 10.5,
  }),
  makeSpecies({
    id: 'chien-pao',
    dexNumber: 1002,
    types: ['dark', 'ice'],
    baseStats: { hp: 80, atk: 120, def: 80, spa: 90, spd: 65, spe: 135 },
    abilities: ['sword-of-ruin'],
    weightKg: 152.2,
    classification: 'legendary',
  }),
  makeSpecies({
    id: 'urshifu-rapid-strike',
    dexNumber: 892,
    baseSpecies: 'urshifu',
    formName: 'Rapid-Strike',
    types: ['fighting', 'water'],
    baseStats: { hp: 100, atk: 130, def: 100, spa: 63, spd: 60, spe: 97 },
    abilities: ['unseen-fist'],
    weightKg: 105,
    classification: 'legendary',
  }),
  makeSpecies({
    id: 'dondozo',
    dexNumber: 977,
    types: ['water'],
    baseStats: { hp: 150, atk: 100, def: 115, spa: 65, spd: 65, spe: 35 },
    abilities: ['unaware', 'oblivious'],
    weightKg: 220,
  }),
  makeSpecies({
    id: 'dragonite',
    dexNumber: 149,
    types: ['dragon', 'flying'],
    baseStats: { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 },
    abilities: ['inner-focus'],
    hiddenAbility: 'multiscale',
    weightKg: 210,
  }),
  makeSpecies({
    id: 'dusclops',
    dexNumber: 356,
    types: ['ghost'],
    baseStats: { hp: 40, atk: 70, def: 130, spa: 60, spd: 130, spe: 25 },
    abilities: ['pressure'],
    hiddenAbility: 'frisk',
    weightKg: 30.6,
    canEvolve: true,
  }),
  makeSpecies({
    id: 'shedinja',
    dexNumber: 292,
    types: ['bug', 'ghost'],
    baseStats: { hp: 1, atk: 90, def: 45, spa: 30, spd: 30, spe: 40 },
    abilities: ['wonder-guard'],
    weightKg: 1.2,
  }),
  makeSpecies({
    id: 'miraidon',
    dexNumber: 1008,
    types: ['electric', 'dragon'],
    baseStats: { hp: 100, atk: 85, def: 100, spa: 135, spd: 115, spe: 135 },
    abilities: ['hadron-engine'],
    weightKg: 240,
    classification: 'restricted',
  }),
  makeSpecies({
    id: 'scizor',
    dexNumber: 212,
    types: ['bug', 'steel'],
    baseStats: { hp: 70, atk: 130, def: 100, spa: 55, spd: 80, spe: 65 },
    abilities: ['swarm', 'technician'],
    hiddenAbility: 'light-metal',
    weightKg: 118,
    heightM: 1.8,
  }),
  makeSpecies({
    id: 'breloom',
    dexNumber: 286,
    types: ['grass', 'fighting'],
    baseStats: { hp: 60, atk: 130, def: 80, spa: 60, spd: 60, spe: 70 },
    abilities: ['effect-spore', 'poison-heal'],
    hiddenAbility: 'technician',
    weightKg: 39.2,
    heightM: 1.2,
  }),
  makeSpecies({
    id: 'blissey',
    dexNumber: 242,
    types: ['normal'],
    baseStats: { hp: 255, atk: 10, def: 10, spa: 75, spd: 135, spe: 55 },
    abilities: ['natural-cure', 'serene-grace'],
    hiddenAbility: 'healer',
    weightKg: 46.8,
    heightM: 1.5,
  }),
  makeSpecies({
    id: 'weavile',
    dexNumber: 461,
    types: ['dark', 'ice'],
    baseStats: { hp: 70, atk: 120, def: 65, spa: 45, spd: 85, spe: 125 },
    abilities: ['pressure'],
    hiddenAbility: 'pickpocket',
    weightKg: 34,
    heightM: 1.1,
  }),
  makeSpecies({
    id: 'pelipper',
    dexNumber: 279,
    types: ['water', 'flying'],
    baseStats: { hp: 60, atk: 50, def: 100, spa: 95, spd: 70, spe: 65 },
    abilities: ['keen-eye', 'drizzle'],
    hiddenAbility: 'rain-dish',
    weightKg: 28,
    heightM: 1.2,
  }),
  makeSpecies({
    id: 'gyarados',
    dexNumber: 130,
    types: ['water', 'flying'],
    baseStats: { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, spe: 81 },
    abilities: ['intimidate'],
    hiddenAbility: 'moxie',
    weightKg: 235,
    heightM: 6.5,
  }),
  makeSpecies({
    id: 'swampert',
    dexNumber: 260,
    types: ['water', 'ground'],
    baseStats: { hp: 100, atk: 110, def: 90, spa: 85, spd: 90, spe: 60 },
    abilities: ['torrent'],
    hiddenAbility: 'damp',
    weightKg: 81.9,
    heightM: 1.5,
  }),
  makeSpecies({
    id: 'crawdaunt',
    dexNumber: 342,
    types: ['water', 'dark'],
    baseStats: { hp: 63, atk: 120, def: 85, spa: 90, spd: 55, spe: 55 },
    abilities: ['hyper-cutter', 'shell-armor'],
    hiddenAbility: 'adaptability',
    weightKg: 32.8,
    heightM: 1.1,
  }),
  makeSpecies({
    id: 'toxicroak',
    dexNumber: 454,
    types: ['poison', 'fighting'],
    baseStats: { hp: 83, atk: 106, def: 65, spa: 86, spd: 65, spe: 85 },
    abilities: ['anticipation', 'dry-skin'],
    hiddenAbility: 'poison-touch',
    weightKg: 44.4,
    heightM: 1.3,
  }),
  makeSpecies({
    id: 'chi-yu',
    dexNumber: 1004,
    types: ['dark', 'fire'],
    baseStats: { hp: 55, atk: 80, def: 80, spa: 135, spd: 120, spe: 100 },
    abilities: ['beads-of-ruin'],
    weightKg: 4.9,
    heightM: 0.4,
    classification: 'sub-legendary',
  }),
  makeSpecies({
    id: 'charizard',
    dexNumber: 6,
    types: ['fire', 'flying'],
    baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
    abilities: ['blaze'],
    hiddenAbility: 'solar-power',
    weightKg: 90.5,
    heightM: 1.7,
  }),
  makeSpecies({
    id: 'corviknight',
    dexNumber: 823,
    types: ['flying', 'steel'],
    baseStats: { hp: 98, atk: 87, def: 105, spa: 53, spd: 85, spe: 67 },
    abilities: ['pressure', 'unnerve'],
    hiddenAbility: 'mirror-armor',
    weightKg: 75,
    heightM: 2.2,
  }),
  makeSpecies({
    id: 'hawlucha',
    dexNumber: 701,
    types: ['fighting', 'flying'],
    baseStats: { hp: 78, atk: 92, def: 75, spa: 74, spd: 63, spe: 118 },
    abilities: ['limber', 'unburden'],
    hiddenAbility: 'mold-breaker',
    weightKg: 21.5,
    heightM: 0.8,
  }),
  // The four Ogerpon are here because Ivy Cudgel takes the mask's type, and a
  // form that is treated as its base species gets that wrong four ways.
  // Raging Bull takes the breed's type the way Ivy Cudgel takes the mask's.
  makeSpecies({
    id: 'tauros-paldea-combat-breed',
    dexNumber: 128,
    baseSpecies: 'tauros',
    formName: 'Paldea-Combat-Breed',
    types: ['fighting'],
    baseStats: { hp: 75, atk: 110, def: 105, spa: 30, spd: 70, spe: 100 },
    abilities: ['intimidate', 'anger-point'],
    hiddenAbility: 'cud-chew',
    weightKg: 115,
    heightM: 1.4,
  }),
  makeSpecies({
    id: 'tauros-paldea-blaze-breed',
    dexNumber: 128,
    baseSpecies: 'tauros',
    formName: 'Paldea-Blaze-Breed',
    types: ['fighting', 'fire'],
    baseStats: { hp: 75, atk: 110, def: 105, spa: 30, spd: 70, spe: 100 },
    abilities: ['intimidate', 'anger-point'],
    hiddenAbility: 'cud-chew',
    weightKg: 85,
    heightM: 1.4,
  }),
  makeSpecies({
    id: 'tauros-paldea-aqua-breed',
    dexNumber: 128,
    baseSpecies: 'tauros',
    formName: 'Paldea-Aqua-Breed',
    types: ['fighting', 'water'],
    baseStats: { hp: 75, atk: 110, def: 105, spa: 30, spd: 70, spe: 100 },
    abilities: ['intimidate', 'anger-point'],
    hiddenAbility: 'cud-chew',
    weightKg: 110,
    heightM: 1.4,
  }),
  makeSpecies({
    id: 'ogerpon',
    dexNumber: 1017,
    types: ['grass'],
    baseStats: { hp: 80, atk: 120, def: 84, spa: 60, spd: 96, spe: 110 },
    abilities: ['defiant'],
    weightKg: 39.8,
    heightM: 1.2,
    classification: 'sub-legendary',
  }),
  makeSpecies({
    id: 'ogerpon-wellspring-mask',
    dexNumber: 1017,
    baseSpecies: 'ogerpon',
    formName: 'Wellspring-Mask',
    types: ['grass', 'water'],
    baseStats: { hp: 80, atk: 120, def: 84, spa: 60, spd: 96, spe: 110 },
    abilities: ['water-absorb'],
    weightKg: 39.8,
    heightM: 1.2,
    classification: 'sub-legendary',
  }),
  makeSpecies({
    id: 'ogerpon-hearthflame-mask',
    dexNumber: 1017,
    baseSpecies: 'ogerpon',
    formName: 'Hearthflame-Mask',
    types: ['grass', 'fire'],
    baseStats: { hp: 80, atk: 120, def: 84, spa: 60, spd: 96, spe: 110 },
    abilities: ['mold-breaker'],
    weightKg: 39.8,
    heightM: 1.2,
    classification: 'sub-legendary',
  }),
  makeSpecies({
    id: 'ogerpon-cornerstone-mask',
    dexNumber: 1017,
    baseSpecies: 'ogerpon',
    formName: 'Cornerstone-Mask',
    types: ['grass', 'rock'],
    baseStats: { hp: 80, atk: 120, def: 84, spa: 60, spd: 96, spe: 110 },
    abilities: ['sturdy'],
    weightKg: 39.8,
    heightM: 1.2,
    classification: 'sub-legendary',
  }),
  // The conditional-power cases. Each of these is the carrier the hostile
  // review's own reproduction named, so a differential test can rebuild it.
  makeSpecies({
    id: 'kingambit',
    dexNumber: 983,
    types: ['dark', 'steel'],
    baseStats: { hp: 100, atk: 135, def: 120, spa: 60, spd: 85, spe: 50 },
    abilities: ['defiant', 'supreme-overlord'],
    hiddenAbility: 'pressure',
    weightKg: 120,
    heightM: 2,
  }),
  makeSpecies({
    id: 'ursaluna',
    dexNumber: 901,
    types: ['ground', 'normal'],
    baseStats: { hp: 130, atk: 140, def: 105, spa: 45, spd: 80, spe: 50 },
    abilities: ['guts', 'bulletproof'],
    hiddenAbility: 'unnerve',
    weightKg: 290,
    heightM: 2.4,
  }),
  makeSpecies({
    id: 'talonflame',
    dexNumber: 663,
    types: ['fire', 'flying'],
    baseStats: { hp: 78, atk: 81, def: 71, spa: 74, spd: 69, spe: 126 },
    abilities: ['flame-body'],
    hiddenAbility: 'gale-wings',
    weightKg: 24.5,
    heightM: 1.2,
  }),
  makeSpecies({
    id: 'dracozolt',
    dexNumber: 880,
    types: ['electric', 'dragon'],
    baseStats: { hp: 90, atk: 100, def: 90, spa: 80, spd: 70, spe: 75 },
    abilities: ['volt-absorb', 'hustle'],
    hiddenAbility: 'sand-rush',
    weightKg: 190,
    heightM: 1.8,
  }),
  makeSpecies({
    id: 'glimmora',
    dexNumber: 970,
    types: ['rock', 'poison'],
    baseStats: { hp: 83, atk: 55, def: 90, spa: 130, spd: 81, spe: 86 },
    abilities: ['toxic-debris'],
    hiddenAbility: 'corrosion',
    weightKg: 45,
    heightM: 1.5,
  }),
  makeSpecies({
    id: 'raging-bolt',
    dexNumber: 1021,
    types: ['electric', 'dragon'],
    baseStats: { hp: 125, atk: 73, def: 91, spa: 137, spd: 89, spe: 75 },
    abilities: ['protosynthesis'],
    weightKg: 480,
    heightM: 5.2,
    classification: 'paradox',
  }),
  makeSpecies({
    id: 'iron-leaves',
    dexNumber: 1010,
    types: ['grass', 'psychic'],
    baseStats: { hp: 90, atk: 130, def: 88, spa: 70, spd: 108, spe: 104 },
    abilities: ['quark-drive'],
    weightKg: 125,
    heightM: 1.5,
    classification: 'paradox',
  }),
  makeSpecies({
    id: 'koraidon',
    dexNumber: 1007,
    types: ['fighting', 'dragon'],
    baseStats: { hp: 100, atk: 135, def: 115, spa: 85, spd: 100, spe: 135 },
    abilities: ['orichalcum-pulse'],
    weightKg: 303,
    heightM: 2.5,
    classification: 'restricted',
  }),
  makeSpecies({
    id: 'tyranitar',
    dexNumber: 248,
    types: ['rock', 'dark'],
    baseStats: { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 },
    abilities: ['sand-stream'],
    hiddenAbility: 'unnerve',
    weightKg: 202,
    heightM: 2,
  }),
  makeSpecies({
    id: 'clefable',
    dexNumber: 36,
    types: ['fairy'],
    baseStats: { hp: 95, atk: 70, def: 73, spa: 95, spd: 90, spe: 60 },
    abilities: ['cute-charm', 'magic-guard'],
    hiddenAbility: 'unaware',
    weightKg: 40,
    heightM: 1.3,
  }),
  makeSpecies({
    id: 'cloyster',
    dexNumber: 91,
    types: ['water', 'ice'],
    baseStats: { hp: 50, atk: 95, def: 180, spa: 85, spd: 45, spe: 70 },
    abilities: ['shell-armor', 'skill-link'],
    hiddenAbility: 'overcoat',
    weightKg: 132.5,
    heightM: 1.5,
  }),
  makeSpecies({
    id: 'venusaur',
    dexNumber: 3,
    types: ['grass', 'poison'],
    baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 },
    abilities: ['overgrow'],
    hiddenAbility: 'chlorophyll',
    weightKg: 100,
    heightM: 2,
  }),
  // The stage rewrites. Each carries, as a regular ability, one of the
  // abilities that changes a stat stage before it lands.
  makeSpecies({
    id: 'bibarel',
    dexNumber: 400,
    types: ['normal', 'water'],
    baseStats: { hp: 79, atk: 85, def: 60, spa: 55, spd: 60, spe: 71 },
    abilities: ['simple', 'unaware'],
    hiddenAbility: 'moody',
    weightKg: 31.5,
  }),
  makeSpecies({
    id: 'malamar',
    dexNumber: 687,
    types: ['dark', 'psychic'],
    baseStats: { hp: 86, atk: 92, def: 88, spa: 68, spd: 75, spe: 73 },
    abilities: ['contrary', 'suction-cups'],
    hiddenAbility: 'infiltrator',
    weightKg: 47,
    heightM: 1.5,
  }),
  makeSpecies({
    id: 'wigglytuff',
    dexNumber: 40,
    types: ['normal', 'fairy'],
    baseStats: { hp: 140, atk: 70, def: 45, spa: 85, spd: 50, spe: 45 },
    abilities: ['cute-charm', 'competitive'],
    hiddenAbility: 'frisk',
    weightKg: 12,
  }),
  makeSpecies({
    id: 'metagross',
    dexNumber: 376,
    types: ['steel', 'psychic'],
    baseStats: { hp: 80, atk: 135, def: 130, spa: 95, spd: 90, spe: 70 },
    abilities: ['clear-body'],
    hiddenAbility: 'light-metal',
    weightKg: 550,
    heightM: 1.6,
  }),
  makeSpecies({
    id: 'mabosstiff',
    dexNumber: 943,
    types: ['dark'],
    baseStats: { hp: 80, atk: 120, def: 90, spa: 60, spd: 70, spe: 85 },
    abilities: ['intimidate', 'guard-dog'],
    hiddenAbility: 'stakeout',
    weightKg: 61,
  }),
  makeSpecies({
    id: 'mudsdale',
    dexNumber: 750,
    types: ['ground'],
    baseStats: { hp: 100, atk: 125, def: 100, spa: 55, spd: 85, spe: 35 },
    abilities: ['own-tempo', 'stamina'],
    hiddenAbility: 'inner-focus',
    weightKg: 920,
    heightM: 2.5,
  }),
  /**
   * Not in Scarlet and Violet, and ordinary in every other respect: no
   * classification bars it, no ban list names it, and it is fast enough to
   * reach a Regulation G speed ladder it has no business being on.
   */
  makeSpecies({
    id: 'pidgeot',
    dexNumber: 18,
    types: ['normal', 'flying'],
    baseStats: { hp: 83, atk: 80, def: 75, spa: 70, spd: 70, spe: 101 },
    abilities: ['keen-eye', 'tangled-feet'],
    hiddenAbility: 'big-pecks',
    weightKg: 39.5,
    heightM: 1.5,
    availableIn: [],
  }),
  makeSpecies({
    id: 'mewtwo',
    dexNumber: 150,
    types: ['psychic'],
    baseStats: { hp: 106, atk: 110, def: 90, spa: 154, spd: 90, spe: 130 },
    abilities: ['pressure'],
    hiddenAbility: 'unnerve',
    weightKg: 122,
    heightM: 2,
    classification: 'restricted',
  }),
  /**
   * A Mega form, classified as one. Mega Evolution does not exist in
   * generation IX, so it is both `mega` and unavailable, and either fact on its
   * own is enough to keep it out of a regulation.
   */
  makeSpecies({
    id: 'mewtwo-mega-y',
    dexNumber: 150,
    baseSpecies: 'mewtwo',
    formName: 'Mega-Y',
    types: ['psychic'],
    baseStats: { hp: 106, atk: 150, def: 70, spa: 194, spd: 120, spe: 140 },
    abilities: ['insomnia'],
    weightKg: 33,
    heightM: 1.5,
    classification: 'mega',
    availableIn: [],
  }),
]

type MoveSeed = {
  id: string
  type: PokemonType
  category: MoveCategory
  basePower: number
  accuracy?: number | null
  pp?: number
  priority?: number
  target?: MoveTarget
  flags?: Partial<MoveFlags>
  critRatio?: number
  multiHit?: { min: number; max: number }
  drain?: number
  recoil?: number
  variablePower?: VariablePower
  raisesEvasion?: boolean
}

function makeMove(seed: MoveSeed): Move {
  return {
    id: moveId(seed.id),
    name: seed.id
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    type: seed.type,
    category: seed.category,
    basePower: seed.basePower,
    accuracy: seed.accuracy === undefined ? 100 : seed.accuracy,
    pp: seed.pp ?? 10,
    priority: seed.priority ?? 0,
    target: seed.target ?? 'selected-target',
    flags: { ...NO_FLAGS, ...seed.flags },
    critRatio: seed.critRatio ?? 0,
    multiHit: seed.multiHit ?? null,
    drain: seed.drain ?? 0,
    recoil: seed.recoil ?? 0,
    statChanges: [],
    raisesEvasion: seed.raisesEvasion ?? false,
    generation: 9,
    variablePower: seed.variablePower ?? null,
    description: '',
  }
}

const MOVES: readonly Move[] = [
  makeMove({
    id: 'earthquake',
    type: 'ground',
    category: 'physical',
    basePower: 100,
    target: 'all-adjacent',
  }),
  makeMove({
    id: 'dragon-claw',
    type: 'dragon',
    category: 'physical',
    basePower: 80,
    flags: { contact: true },
  }),
  makeMove({
    id: 'swords-dance',
    type: 'normal',
    category: 'status',
    basePower: 0,
    accuracy: null,
    target: 'user',
  }),
  makeMove({
    id: 'protect',
    type: 'normal',
    category: 'status',
    basePower: 0,
    accuracy: null,
    priority: 4,
    target: 'user',
  }),
  makeMove({ id: 'hydro-pump', type: 'water', category: 'special', basePower: 110, accuracy: 80 }),
  makeMove({ id: 'volt-switch', type: 'electric', category: 'special', basePower: 70 }),
  makeMove({ id: 'will-o-wisp', type: 'fire', category: 'status', basePower: 0, accuracy: 85 }),
  makeMove({ id: 'moonblast', type: 'fairy', category: 'special', basePower: 95 }),
  makeMove({ id: 'shadow-ball', type: 'ghost', category: 'special', basePower: 80 }),
  makeMove({
    id: 'close-combat',
    type: 'fighting',
    category: 'physical',
    basePower: 120,
    flags: { contact: true },
  }),
  makeMove({
    id: 'surging-strikes',
    type: 'water',
    category: 'physical',
    basePower: 25,
    multiHit: { min: 3, max: 3 },
    critRatio: 3,
    flags: { contact: true, punch: true },
  }),
  makeMove({ id: 'icicle-crash', type: 'ice', category: 'physical', basePower: 85, accuracy: 90 }),
  makeMove({
    id: 'spore',
    type: 'grass',
    category: 'status',
    basePower: 0,
    flags: { powder: true },
  }),
  makeMove({
    id: 'rage-powder',
    type: 'bug',
    category: 'status',
    basePower: 0,
    accuracy: null,
    priority: 2,
    target: 'user',
    flags: { powder: true },
  }),
  makeMove({
    id: 'fake-out',
    type: 'normal',
    category: 'physical',
    basePower: 40,
    priority: 3,
    flags: { contact: true },
  }),
  makeMove({
    id: 'knock-off',
    type: 'dark',
    category: 'physical',
    basePower: 65,
    flags: { contact: true },
  }),
  makeMove({
    id: 'body-press',
    type: 'fighting',
    category: 'physical',
    basePower: 80,
    flags: { contact: true },
  }),
  makeMove({ id: 'thunderbolt', type: 'electric', category: 'special', basePower: 90 }),
  makeMove({ id: 'flamethrower', type: 'fire', category: 'special', basePower: 90 }),
  makeMove({
    id: 'heat-wave',
    type: 'fire',
    category: 'special',
    basePower: 95,
    accuracy: 90,
    target: 'all-adjacent-foes',
  }),
  makeMove({
    id: 'make-it-rain',
    type: 'steel',
    category: 'special',
    basePower: 120,
    target: 'all-adjacent-foes',
  }),
  makeMove({ id: 'tera-blast', type: 'normal', category: 'special', basePower: 80 }),
  makeMove({
    id: 'wave-crash',
    type: 'water',
    category: 'physical',
    basePower: 120,
    recoil: 0.33,
    flags: { contact: true },
  }),
  makeMove({
    id: 'draining-kiss',
    type: 'fairy',
    category: 'special',
    basePower: 50,
    drain: 0.75,
    flags: { contact: true },
  }),
  makeMove({
    id: 'sacred-sword',
    type: 'fighting',
    category: 'physical',
    basePower: 90,
    flags: { contact: true, slicing: true, ignoresDefenseBoosts: true },
  }),
  makeMove({
    id: 'aerial-ace',
    type: 'flying',
    category: 'physical',
    basePower: 60,
    accuracy: null,
    flags: { contact: true, slicing: true, alwaysHits: true },
  }),
  makeMove({
    id: 'bullet-punch',
    type: 'steel',
    category: 'physical',
    basePower: 40,
    pp: 30,
    priority: 1,
    flags: { contact: true, punch: true },
  }),
  makeMove({
    id: 'mach-punch',
    type: 'fighting',
    category: 'physical',
    basePower: 40,
    pp: 30,
    priority: 1,
    flags: { contact: true, punch: true },
  }),
  makeMove({
    id: 'crabhammer',
    type: 'water',
    category: 'physical',
    basePower: 100,
    accuracy: 90,
    critRatio: 1,
    flags: { contact: true },
  }),
  makeMove({ id: 'ivy-cudgel', type: 'grass', category: 'physical', basePower: 100, critRatio: 1 }),
  makeMove({ id: 'freeze-dry', type: 'ice', category: 'special', basePower: 70, pp: 20 }),
  makeMove({
    id: 'raging-bull',
    type: 'normal',
    category: 'physical',
    basePower: 90,
    flags: { contact: true },
  }),
  makeMove({
    id: 'flying-press',
    type: 'fighting',
    category: 'physical',
    basePower: 100,
    accuracy: 95,
    flags: { contact: true },
  }),
  // Conditional base power. Every value is the dataset's own.
  makeMove({
    id: 'facade',
    type: 'normal',
    category: 'physical',
    basePower: 70,
    pp: 20,
    flags: { contact: true },
  }),
  makeMove({
    id: 'acrobatics',
    type: 'flying',
    category: 'physical',
    basePower: 55,
    pp: 15,
    flags: { contact: true },
  }),
  makeMove({
    id: 'bolt-beak',
    type: 'electric',
    category: 'physical',
    basePower: 85,
    flags: { contact: true },
  }),
  makeMove({ id: 'brine', type: 'water', category: 'special', basePower: 65 }),
  makeMove({
    id: 'payback',
    type: 'dark',
    category: 'physical',
    basePower: 50,
    flags: { contact: true },
  }),
  makeMove({ id: 'venoshock', type: 'poison', category: 'special', basePower: 65 }),
  makeMove({
    id: 'weather-ball',
    type: 'normal',
    category: 'special',
    basePower: 50,
    flags: { bullet: true },
  }),
  makeMove({ id: 'rising-voltage', type: 'electric', category: 'special', basePower: 70, pp: 20 }),
  makeMove({
    id: 'terrain-pulse',
    type: 'normal',
    category: 'special',
    basePower: 50,
    flags: { pulse: true },
  }),
  makeMove({
    id: 'psyblade',
    type: 'psychic',
    category: 'physical',
    basePower: 80,
    pp: 15,
    flags: { contact: true, slicing: true },
  }),
  makeMove({
    id: 'collision-course',
    type: 'fighting',
    category: 'physical',
    basePower: 100,
    pp: 5,
    flags: { contact: true },
  }),
  makeMove({
    id: 'misty-explosion',
    type: 'fairy',
    category: 'special',
    basePower: 100,
    pp: 5,
    target: 'all-adjacent',
  }),
  makeMove({ id: 'stored-power', type: 'psychic', category: 'special', basePower: 20 }),
  makeMove({
    id: 'triple-axel',
    type: 'ice',
    category: 'physical',
    basePower: 20,
    accuracy: 90,
    multiHit: { min: 3, max: 3 },
    flags: { contact: true },
  }),
  makeMove({
    id: 'icicle-spear',
    type: 'ice',
    category: 'physical',
    basePower: 25,
    multiHit: { min: 2, max: 5 },
    flags: { contact: true },
  }),
  makeMove({
    id: 'population-bomb',
    type: 'normal',
    category: 'physical',
    basePower: 20,
    accuracy: 90,
    multiHit: { min: 1, max: 10 },
    flags: { contact: true },
  }),
  makeMove({ id: 'solar-beam', type: 'grass', category: 'special', basePower: 120 }),
  makeMove({
    id: 'meteor-beam',
    type: 'rock',
    category: 'special',
    basePower: 120,
    accuracy: 90,
  }),
  makeMove({ id: 'electro-shot', type: 'electric', category: 'special', basePower: 130 }),
  makeMove({ id: 'hex', type: 'ghost', category: 'special', basePower: 65 }),
  makeMove({
    id: 'assurance',
    type: 'dark',
    category: 'physical',
    basePower: 60,
    flags: { contact: true },
  }),
  /** The two clauses every Smogon format declares and used to leave unchecked. */
  makeMove({
    id: 'sheer-cold',
    type: 'ice',
    category: 'special',
    basePower: 0,
    accuracy: 30,
    pp: 5,
    variablePower: { kind: 'ohko' },
  }),
  makeMove({
    id: 'minimize',
    type: 'normal',
    category: 'status',
    basePower: 0,
    accuracy: null,
    pp: 10,
    target: 'user',
    raisesEvasion: true,
  }),
]

type ItemSeed = { id: string; effect: Item['effect']; isBerry?: boolean; flingPower?: number }

function makeItem(seed: ItemSeed): Item {
  return {
    id: itemId(seed.id),
    name: seed.id
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    isBerry: seed.isBerry ?? false,
    flingPower: seed.flingPower ?? 0,
    restrictedTo: [],
    effect: seed.effect,
    description: '',
  }
}

const ITEMS: readonly Item[] = [
  makeItem({ id: 'choice-band', effect: { kind: 'choice', stat: 'atk', multiplier: 1.5 } }),
  makeItem({ id: 'choice-specs', effect: { kind: 'choice', stat: 'spa', multiplier: 1.5 } }),
  makeItem({ id: 'choice-scarf', effect: { kind: 'choice', stat: 'spe', multiplier: 1.5 } }),
  makeItem({ id: 'life-orb', effect: { kind: 'life-orb' } }),
  makeItem({ id: 'expert-belt', effect: { kind: 'expert-belt' } }),
  makeItem({ id: 'muscle-band', effect: { kind: 'category-boost', category: 'physical' } }),
  makeItem({ id: 'wise-glasses', effect: { kind: 'category-boost', category: 'special' } }),
  makeItem({ id: 'assault-vest', effect: { kind: 'assault-vest' } }),
  makeItem({ id: 'eviolite', effect: { kind: 'eviolite' } }),
  makeItem({ id: 'charcoal', effect: { kind: 'type-boost', type: 'fire', multiplier: 1.2 } }),
  makeItem({ id: 'mystic-water', effect: { kind: 'type-boost', type: 'water', multiplier: 1.2 } }),
  makeItem({ id: 'leftovers', effect: { kind: 'recovery', fraction: 1 / 16 } }),
  makeItem({ id: 'sitrus-berry', isBerry: true, effect: { kind: 'recovery', fraction: 0.25 } }),
  makeItem({ id: 'booster-energy', effect: { kind: 'booster-energy' } }),
  makeItem({ id: 'rocky-helmet', effect: { kind: 'utility' } }),
  makeItem({ id: 'focus-sash', effect: { kind: 'utility' } }),
  makeItem({ id: 'safety-goggles', effect: { kind: 'utility' } }),
  // Present so tests can exercise the "this item is outside the model" note.
  makeItem({ id: 'punching-glove', effect: { kind: 'unmodelled' } }),
]

const ABILITY_NAMES = [
  'sand-veil',
  'rough-skin',
  'levitate',
  'intimidate',
  'blaze',
  'protosynthesis',
  'effect-spore',
  'regenerator',
  'sword-of-ruin',
  'unseen-fist',
  'unaware',
  'oblivious',
  'inner-focus',
  'multiscale',
  'pressure',
  'frisk',
  'wonder-guard',
  'hadron-engine',
  'adaptability',
  'guts',
  'huge-power',
  'solid-rock',
  'tinted-lens',
  'thick-fat',
  'water-absorb',
  'mold-breaker',
  'technician',
  'sheer-force',
  'dry-skin',
  'beads-of-ruin',
  'defiant',
  'sturdy',
  'limber',
  'natural-cure',
  'keen-eye',
  'moxie',
  'anger-point',
  'supreme-overlord',
  'bulletproof',
  'unnerve',
  'flame-body',
  'gale-wings',
  'volt-absorb',
  'hustle',
  'sand-rush',
  'toxic-debris',
  'corrosion',
  'quark-drive',
  'orichalcum-pulse',
  'sand-stream',
  'cute-charm',
  'magic-guard',
  'shell-armor',
  'skill-link',
  'overcoat',
  'overgrow',
  'chlorophyll',
  'simple',
  'contrary',
  'competitive',
  'clear-body',
  'guard-dog',
  'own-tempo',
  'hyper-cutter',
] as const

/** `of` stays lower case, so the fixture reads `Sword of Ruin` like the games. */
const MINOR_WORDS = new Set(['of', 'to', 'as', 'the'])

const ABILITIES: readonly Ability[] = ABILITY_NAMES.map((name) => ({
  id: abilityId(name),
  name: name
    .split('-')
    .map((part, index) =>
      index > 0 && MINOR_WORDS.has(part) ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' '),
  description: '',
  suppressable: true,
}))

const FORMATS: readonly Format[] = [
  {
    id: formatId('vgc-reg-h'),
    name: 'VGC Regulation H',
    shortName: 'Reg H',
    generation: 9,
    style: 'doubles',
    teamSize: 6,
    bringSize: 4,
    level: { kind: 'fixed', level: 50 },
    gimmick: 'terastal',
    clauses: ['species', 'item'],
    legality: {
      ...EMPTY_LEGALITY,
      bannedClassifications: ['legendary', 'mythical', 'sub-legendary', 'paradox', 'restricted'],
    },
    source: {
      authority: 'vgc',
      citation: 'Fixture ruleset. Not the real Regulation H.',
      verifiedOn: '2026-08-16',
      staleAfterDays: 30,
    },
  },
  {
    id: formatId('gen9-ou'),
    name: 'Smogon Gen 9 OU',
    shortName: 'OU',
    generation: 9,
    style: 'singles',
    teamSize: 6,
    bringSize: 6,
    level: { kind: 'capped', max: 100 },
    gimmick: 'terastal',
    clauses: ['species', 'sleep', 'evasion', 'ohko', 'endless-battle'],
    legality: {
      ...EMPTY_LEGALITY,
      bannedSpecies: [speciesId('miraidon'), speciesId('flutter-mane')],
    },
    source: {
      authority: 'smogon',
      citation: 'Fixture ruleset. Not the real OU banlist.',
      verifiedOn: '2026-08-16',
      staleAfterDays: 31,
    },
  },
]

/**
 * Learnsets. Deliberately generous — every species can use every damaging move
 * in the fixture unless it is listed here with a narrower set. Tests that care
 * about learnset legality use the narrow entries.
 */
const NARROW_LEARNSETS: Readonly<Record<string, readonly string[]>> = {
  amoonguss: ['spore', 'rage-powder', 'protect', 'shadow-ball'],
  shedinja: ['shadow-ball', 'protect'],
  dusclops: ['shadow-ball', 'protect', 'will-o-wisp', 'body-press'],
}

const ALL_MOVE_IDS: readonly MoveId[] = MOVES.map((move) => move.id)

function index<T extends { id: string }>(records: readonly T[]): ReadonlyMap<string, T> {
  return new Map(records.map((record) => [record.id, record]))
}

const SPECIES_BY_ID = index(SPECIES)
const MOVES_BY_ID = index(MOVES)
const ITEMS_BY_ID = index(ITEMS)
const ABILITIES_BY_ID = index(ABILITIES)
const FORMATS_BY_ID = index(FORMATS)

export const fixtureDex: Dex = {
  species: (id: SpeciesId) => SPECIES_BY_ID.get(id),
  move: (id: MoveId) => MOVES_BY_ID.get(id),
  item: (id: ItemId) => ITEMS_BY_ID.get(id),
  ability: (id: AbilityId) => ABILITIES_BY_ID.get(id),
  format: (id: FormatId) => FORMATS_BY_ID.get(id),
  allSpecies: () => SPECIES,
  allMoves: () => MOVES,
  allItems: () => ITEMS,
  allAbilities: () => ABILITIES,
  allFormats: () => FORMATS,
  learnset: (id: SpeciesId) => {
    const narrow = NARROW_LEARNSETS[id]
    return narrow === undefined ? ALL_MOVE_IDS : narrow.map(moveId)
  },
}
