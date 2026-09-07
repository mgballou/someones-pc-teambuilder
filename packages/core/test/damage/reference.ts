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
import type { Nature, StatSpread, TeraType } from '../../src/index'
import { moveId } from '../../src/index'
import { calculate, DEFAULT_FIELD, newAttacker, newDefender } from '../../src/damage/index'
import { fixtureDex } from '../fixtures/dex'
import { buildSet } from './helpers'

const GEN = Generations.get(9)

type ReferenceOptions = NonNullable<ConstructorParameters<typeof ReferencePokemon>[2]>
type ReferenceTypeName = NonNullable<ReferenceOptions['teraType']>

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
  readonly nature?: Nature
  readonly evs?: Partial<StatSpread>
  readonly teraType?: TeraType
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
}

function ours({ attacker, defender, move }: Scenario): readonly number[] {
  return calculate({
    attacker: newAttacker({
      set: buildSet({
        species: attacker.species,
        nature: attacker.nature ?? 'hardy',
        evs: attacker.evs ?? {},
        ability: attacker.ability,
        teraType: attacker.teraType ?? null,
      }),
      terastallized: attacker.teraType !== undefined,
    }),
    defender: newDefender({
      set: buildSet({
        species: defender.species,
        nature: defender.nature ?? 'hardy',
        evs: defender.evs ?? {},
        ability: defender.ability,
        teraType: defender.teraType ?? null,
      }),
      terastallized: defender.teraType !== undefined,
    }),
    move: moveId(move),
    field: DEFAULT_FIELD,
    dex: fixtureDex,
  }).rolls
}

function referencePokemon(combatant: Combatant): ReferencePokemon {
  return new ReferencePokemon(GEN, combatant.reference, {
    level: 50,
    nature: capitalize(combatant.nature ?? 'hardy'),
    evs: combatant.evs ?? {},
    ability: combatant.referenceAbility,
    ...(combatant.teraType === undefined ? {} : { teraType: REFERENCE_TYPE[combatant.teraType] }),
  })
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function reference(scenario: Scenario): readonly number[] {
  const move = new ReferenceMove(GEN, scenario.referenceMove, {
    isStellarFirstUse: scenario.stellarFirstUse ?? false,
  })
  const result = referenceCalculate(
    GEN,
    referencePokemon(scenario.attacker),
    referencePokemon(scenario.defender),
    move,
    new ReferenceField(),
  )
  const damage = result.damage
  // An absorbed hit comes back as the number zero rather than sixteen of them.
  if (typeof damage === 'number') return new Array<number>(16).fill(damage)
  if (!Array.isArray(damage)) throw new Error(`${scenario.referenceMove} gave no roll array`)
  return damage as readonly number[]
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
