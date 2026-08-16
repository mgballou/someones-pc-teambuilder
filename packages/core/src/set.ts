import type { AbilityId, ItemId, MoveId, SetId, SpeciesId } from './ids.js'
import type { TeraType } from './pokemon-type.js'
import type { Nature, StatSpread } from './stats.js'
import { EMPTY_EVS, PERFECT_IVS, DEFAULT_LEVEL } from './stats.js'

export const MAX_MOVES = 4

export const GENDERS = ['male', 'female', 'genderless'] as const
export type Gender = (typeof GENDERS)[number]

/**
 * One built Pokémon.
 *
 * Data and only data — no methods, no class. It serializes to JSON, round-trips
 * through a Showdown paste, and survives a schema version bump. Anything that
 * wants to *do* something with a set is a function that takes one.
 *
 * `moves` is a fixed-length-4 array of nullable slots rather than a variable
 * array, because the interface shows four slots whether or not they are filled
 * and slot order is meaningful to the person who built it.
 */
export type PokemonSet = {
  readonly id: SetId
  readonly species: SpeciesId
  readonly nickname: string | null
  readonly level: number
  readonly gender: Gender | null
  readonly shiny: boolean
  readonly ability: AbilityId | null
  readonly item: ItemId | null
  readonly nature: Nature
  readonly evs: StatSpread
  readonly ivs: StatSpread
  readonly moves: MoveSlots
  readonly teraType: TeraType | null
  readonly gigantamax: boolean
  /** Free-text, the player's own reasoning. Survives clone and paste. */
  readonly notes: string
}

export type MoveSlots = readonly [
  MoveId | null,
  MoveId | null,
  MoveId | null,
  MoveId | null,
]

export const EMPTY_MOVES: MoveSlots = [null, null, null, null]

export type NewSetInput = {
  readonly id: SetId
  readonly species: SpeciesId
  readonly level?: number
  readonly ability?: AbilityId | null
  readonly nature?: Nature
}

/**
 * A set with every field at its competitive default: level 50, perfect IVs,
 * no EVs, Hardy. Deliberately not "empty" — a builder that starts you at zero
 * IVs makes you fix six fields before you can calculate anything true.
 */
export function newSet({
  id,
  species,
  level = DEFAULT_LEVEL,
  ability = null,
  nature = 'hardy',
}: NewSetInput): PokemonSet {
  return {
    id,
    species,
    nickname: null,
    level,
    gender: null,
    shiny: false,
    ability,
    item: null,
    nature,
    evs: EMPTY_EVS,
    ivs: PERFECT_IVS,
    moves: EMPTY_MOVES,
    teraType: null,
    gigantamax: false,
    notes: '',
  }
}

/** Filled move slots, in slot order. */
export function filledMoves(set: PokemonSet): MoveId[] {
  return set.moves.filter((move): move is MoveId => move !== null)
}

export function moveCount(set: PokemonSet): number {
  return filledMoves(set).length
}

/** Replace one slot, leaving the other three alone. */
export function withMoveAt(set: PokemonSet, index: number, move: MoveId | null): PokemonSet {
  const moves = [...set.moves] as [MoveId | null, MoveId | null, MoveId | null, MoveId | null]
  moves[index] = move
  return { ...set, moves }
}

/** A copy under a new id, so duplicating a set never aliases the original. */
export function cloneSet(set: PokemonSet, id: SetId): PokemonSet {
  return { ...set, id }
}

export function setLabel(set: PokemonSet, speciesName: string): string {
  return set.nickname === null ? speciesName : `${set.nickname} (${speciesName})`
}
