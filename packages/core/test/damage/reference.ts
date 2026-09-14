/**
 * The differential harness.
 *
 * `@smogon/calc` is a published Gen 9 implementation and is used here as an
 * oracle, never as a dependency of the product: a case below builds the same
 * match-up twice — once through `calculate` and once through the reference —
 * and the test asserts all sixteen rolls agree.
 *
 * The fixture and the oracle have to be talking about the same Pokémon, so a
 * case names the reference's spelling explicitly rather than deriving it. Both
 * sides carry the same ability, the same nature, the same EVs, perfect IVs and
 * level 50.
 */

import {
  calculate as referenceCalculate,
  Field as ReferenceField,
  Generations,
  Move as ReferenceMove,
  Pokemon as ReferencePokemon,
} from '@smogon/calc'
import type { BoostSpread, Nature, StatSpread, TeraType } from '../../src/index'
import { moveId, ZERO_BOOSTS } from '../../src/index'
import type { BattleStyle } from '../../src/index'
import type { Field, Status, Terrain, Weather } from '../../src/damage/index'
import {
  calculate,
  DEFAULT_FIELD,
  newAttacker,
  newDefender,
  OPEN_SIDE,
} from '../../src/damage/index'
import { fixtureDex } from '../fixtures/dex'
import { buildSet } from './helpers'

const GEN = Generations.get(9)

type ReferenceOptions = NonNullable<ConstructorParameters<typeof ReferencePokemon>[2]>
type ReferenceTypeName = NonNullable<ReferenceOptions['teraType']>
type ReferenceStatusName = NonNullable<ReferenceOptions['status']>
type ReferenceFieldOptions = NonNullable<ConstructorParameters<typeof ReferenceField>[0]>
type ReferenceWeatherName = NonNullable<ReferenceFieldOptions['weather']>
type ReferenceTerrainName = NonNullable<ReferenceFieldOptions['terrain']>

/** Our slugs against the reference's, for everything a scenario can set. */
const REFERENCE_STATUS: Readonly<Record<Exclude<Status, 'none'>, ReferenceStatusName>> = {
  burn: 'brn',
  poison: 'psn',
  'badly-poisoned': 'tox',
  paralysis: 'par',
  sleep: 'slp',
  freeze: 'frz',
}

const REFERENCE_WEATHER: Readonly<Record<Exclude<Weather, 'none'>, ReferenceWeatherName>> = {
  sun: 'Sun',
  rain: 'Rain',
  sand: 'Sand',
  snow: 'Snow',
}

const REFERENCE_TERRAIN: Readonly<Record<Exclude<Terrain, 'none'>, ReferenceTerrainName>> = {
  electric: 'Electric',
  grassy: 'Grassy',
  psychic: 'Psychic',
  misty: 'Misty',
}

/** Our slugs against the reference's spelling, written out so neither drifts. */
const REFERENCE_TYPE: Readonly<Record<TeraType, ReferenceTypeName>> = {
  normal: 'Normal',
  fire: 'Fire',
  water: 'Water',
  electric: 'Electric',
  grass: 'Grass',
  ice: 'Ice',
  fighting: 'Fighting',
  poison: 'Poison',
  ground: 'Ground',
  flying: 'Flying',
  psychic: 'Psychic',
  bug: 'Bug',
  rock: 'Rock',
  ghost: 'Ghost',
  dragon: 'Dragon',
  dark: 'Dark',
  steel: 'Steel',
  fairy: 'Fairy',
  stellar: 'Stellar',
}

export type Combatant = {
  /** The fixture's species id. */
  readonly species: string
  /** The same species as `@smogon/calc` spells it. */
  readonly reference: string
  /** The fixture's ability slug. */
  readonly ability: string
  /** The same ability as `@smogon/calc` spells it. */
  readonly referenceAbility: string
  readonly level?: number
  readonly nature?: Nature
  readonly evs?: Partial<StatSpread>
  readonly teraType?: TeraType
  /** The fixture's item slug. */
  readonly item?: string
  /** The same item as `@smogon/calc` spells it. */
  readonly referenceItem?: string
  readonly status?: Status
  readonly boosts?: Partial<BoostSpread>
  /** Remaining HP as a fraction of maximum. */
  readonly hpFraction?: number
  /**
   * The reference only applies Protosynthesis and Quark Drive when it has been
   * told which stat they boost, and `'auto'` is how it is told to work it out.
   * The calculator here always works it out, so a Paradox carrier has to say so
   * or the two sides are answering different questions.
   */
  readonly boostedStat?: 'auto'
}

export type Scenario = {
  readonly attacker: Combatant
  readonly defender: Combatant
  /** The fixture's move id. */
  readonly move: string
  /** The same move as `@smogon/calc` spells it. */
  readonly referenceMove: string
  /**
   * Stellar's bonus lands on the first use of each type. The calculator has no
   * turn count and always reports that first use, so the oracle is asked for
   * it too.
   */
  readonly stellarFirstUse?: boolean
  readonly weather?: Weather
  readonly terrain?: Terrain
  /** How many times a multi-hit move lands. Both sides are told the same. */
  readonly hits?: number
  /** Doubles changes the screen modifier and allows a spread hit. */
  readonly style?: BattleStyle
  /** How many Pokemon the hit lands on. Above one takes the spread reduction. */
  readonly targets?: number
  readonly helpingHand?: boolean
  readonly reflect?: boolean
  readonly lightScreen?: boolean
  readonly auroraVeil?: boolean
  readonly friendGuard?: boolean
}

function setFor(combatant: Combatant) {
  return buildSet({
    species: combatant.species,
    level: combatant.level ?? 50,
    nature: combatant.nature ?? 'hardy',
    evs: combatant.evs ?? {},
    ability: combatant.ability,
    item: combatant.item ?? null,
    teraType: combatant.teraType ?? null,
  })
}

function stateOf(combatant: Combatant) {
  return {
    set: setFor(combatant),
    boosts: { ...ZERO_BOOSTS, ...(combatant.boosts ?? {}) },
    hpFraction: combatant.hpFraction ?? 1,
    status: combatant.status ?? 'none',
    terastallized: combatant.teraType !== undefined,
  }
}

function fieldFor(scenario: Scenario): Field {
  return {
    ...DEFAULT_FIELD,
    weather: scenario.weather ?? 'none',
    terrain: scenario.terrain ?? 'none',
    style: scenario.style ?? 'singles',
    attackerSide: { ...OPEN_SIDE, helpingHand: scenario.helpingHand ?? false },
    defenderSide: {
      ...OPEN_SIDE,
      reflect: scenario.reflect ?? false,
      lightScreen: scenario.lightScreen ?? false,
      auroraVeil: scenario.auroraVeil ?? false,
      friendGuard: scenario.friendGuard ?? false,
    },
  }
}

function ours(scenario: Scenario): readonly number[] {
  return calculate({
    attacker: newAttacker({
      ...stateOf(scenario.attacker),
      targets: scenario.targets ?? 1,
      ...(scenario.hits === undefined ? {} : { hits: scenario.hits }),
    }),
    defender: newDefender(stateOf(scenario.defender)),
    move: moveId(scenario.move),
    field: fieldFor(scenario),
    dex: fixtureDex,
  }).rolls
}

function referencePokemon(combatant: Combatant): ReferencePokemon {
  const options: ReferenceOptions = {
    level: combatant.level ?? 50,
    nature: capitalize(combatant.nature ?? 'hardy'),
    evs: combatant.evs ?? {},
    boosts: combatant.boosts ?? {},
    ability: combatant.referenceAbility,
  }
  if (combatant.teraType !== undefined) options.teraType = REFERENCE_TYPE[combatant.teraType]
  if (combatant.referenceItem !== undefined) options.item = combatant.referenceItem
  if (combatant.boostedStat !== undefined) options.boostedStat = combatant.boostedStat
  if (combatant.status !== undefined && combatant.status !== 'none') {
    options.status = REFERENCE_STATUS[combatant.status]
  }
  if (combatant.hpFraction === undefined) {
    return new ReferencePokemon(GEN, combatant.reference, options)
  }
  const full = new ReferencePokemon(GEN, combatant.reference, options)
  options.curHP = Math.max(1, Math.floor(full.maxHP() * combatant.hpFraction))
  return new ReferencePokemon(GEN, combatant.reference, options)
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function referenceField(scenario: Scenario): ReferenceField {
  const field = new ReferenceField({
    gameType: (scenario.style ?? 'singles') === 'doubles' ? 'Doubles' : 'Singles',
    ...(scenario.weather === undefined || scenario.weather === 'none'
      ? {}
      : { weather: REFERENCE_WEATHER[scenario.weather] }),
    ...(scenario.terrain === undefined || scenario.terrain === 'none'
      ? {}
      : { terrain: REFERENCE_TERRAIN[scenario.terrain] }),
  })
  field.attackerSide.isHelpingHand = scenario.helpingHand ?? false
  field.defenderSide.isReflect = scenario.reflect ?? false
  field.defenderSide.isLightScreen = scenario.lightScreen ?? false
  field.defenderSide.isAuroraVeil = scenario.auroraVeil ?? false
  field.defenderSide.isFriendGuard = scenario.friendGuard ?? false
  return field
}

function reference(scenario: Scenario): readonly number[] {
  const move = new ReferenceMove(GEN, scenario.referenceMove, {
    isStellarFirstUse: scenario.stellarFirstUse ?? false,
    ...(scenario.hits === undefined ? {} : { hits: scenario.hits }),
  })
  const result = referenceCalculate(
    GEN,
    referencePokemon(scenario.attacker),
    referencePokemon(scenario.defender),
    move,
    referenceField(scenario),
  )
  const damage = result.damage
  // An absorbed hit comes back as the number zero rather than sixteen of them.
  if (typeof damage === 'number') return new Array<number>(16).fill(damage)
  if (!Array.isArray(damage)) throw new Error(`${scenario.referenceMove} gave no roll array`)
  // A multi-hit move comes back as one roll array per hit, summed roll by roll.
  if (!Array.isArray(damage[0])) return damage as readonly number[]
  return (damage as number[][]).reduce<number[]>(
    (total, hit) => total.map((sum, index) => sum + (hit[index] ?? 0)),
    new Array<number>(16).fill(0),
  )
}

export type Differential = {
  readonly ours: readonly number[]
  readonly reference: readonly number[]
  readonly range: readonly [number, number]
}

export function differential(scenario: Scenario): Differential {
  const mine = ours(scenario)
  return {
    ours: mine,
    reference: reference(scenario),
    range: [mine[0] ?? 0, mine[mine.length - 1] ?? 0],
  }
}
