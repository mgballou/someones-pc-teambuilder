/**
 * The fixture dex.
 *
 * Every test in `@spc/core` runs against this and never against the built
 * dataset or the network. It is deliberately small — a dozen species chosen
 * because each one exercises something the calculator or the analysis has to
 * get right — and every value in it is real.
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
} from '../../src/index.js'
import { abilityId, EMPTY_LEGALITY, formatId, itemId, moveId, speciesId } from '../../src/index.js'

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
    generation: 9,
    variablePower: null,
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
] as const

const ABILITIES: readonly Ability[] = ABILITY_NAMES.map((name) => ({
  id: abilityId(name),
  name: name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
  description: '',
  suppressable: true,
}))

const FORMATS: readonly Format[] = [
  {
    id: formatId('vgc-2026-reg-h'),
    name: 'VGC 2026 Regulation H',
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
