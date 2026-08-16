import type { AbilityId, FormatId, ItemId, MoveId, SpeciesId } from './ids'
import type { Ability, Item } from './item'
import type { Format } from './format'
import type { Move } from './move'
import type { Species } from './species'

/**
 * The data seam.
 *
 * `core` declares what it needs to know and never learns where the answer
 * comes from. `@spc/dex` implements this against a dataset built from PokéAPI;
 * tests implement it against a fixture with nine species in it. Neither the
 * calculator nor the analysis code can tell the difference, which is why none
 * of them need the network.
 *
 * Every lookup is synchronous and total-by-id. Resolving a whole dataset is
 * the implementation's problem, done once, before a `Dex` exists.
 */
export type Dex = {
  readonly species: (id: SpeciesId) => Species | undefined
  readonly move: (id: MoveId) => Move | undefined
  readonly item: (id: ItemId) => Item | undefined
  readonly ability: (id: AbilityId) => Ability | undefined
  readonly format: (id: FormatId) => Format | undefined

  readonly allSpecies: () => readonly Species[]
  readonly allMoves: () => readonly Move[]
  readonly allItems: () => readonly Item[]
  readonly allAbilities: () => readonly Ability[]
  readonly allFormats: () => readonly Format[]

  /**
   * Every move the species can legally learn, by any method, in the dataset's
   * generation. Legality by *method* (egg, tutor, event) is not modelled —
   * see the honesty rules.
   */
  readonly learnset: (id: SpeciesId) => readonly MoveId[]
}

/**
 * Lookup that throws rather than returning `undefined`.
 *
 * Used where a missing id means the dataset is corrupt rather than the user
 * typed something odd — inside the calculator, for instance, which is handed
 * ids that were already validated at the boundary.
 */
export function requireSpecies(dex: Dex, id: SpeciesId): Species {
  const found = dex.species(id)
  if (found === undefined) throw MissingFromDex.species(id)
  return found
}

export function requireMove(dex: Dex, id: MoveId): Move {
  const found = dex.move(id)
  if (found === undefined) throw MissingFromDex.move(id)
  return found
}

export function requireFormat(dex: Dex, id: FormatId): Format {
  const found = dex.format(id)
  if (found === undefined) throw MissingFromDex.format(id)
  return found
}

/** Typed error with static factories, never a hand-written string. */
export class MissingFromDex extends Error {
  override readonly name = 'MissingFromDex'

  private constructor(
    readonly kind: 'species' | 'move' | 'item' | 'ability' | 'format',
    readonly id: string,
  ) {
    super(`No ${kind} in the dataset with id "${id}"`)
  }

  static species(id: SpeciesId): MissingFromDex {
    return new MissingFromDex('species', id)
  }

  static move(id: MoveId): MissingFromDex {
    return new MissingFromDex('move', id)
  }

  static item(id: ItemId): MissingFromDex {
    return new MissingFromDex('item', id)
  }

  static ability(id: AbilityId): MissingFromDex {
    return new MissingFromDex('ability', id)
  }

  static format(id: FormatId): MissingFromDex {
    return new MissingFromDex('format', id)
  }
}
