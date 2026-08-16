import type {
  Ability,
  AbilityId,
  Dex,
  Format,
  FormatId,
  Item,
  ItemId,
  Move,
  MoveId,
  Species,
  SpeciesId,
} from '@spc/core'

/**
 * A `Dex` over a handful of records, built in the browser.
 *
 * The damage panel needs to recompute on every control change, and §2.10 says
 * the interface responds to the input rather than to the network. So the
 * server sends the few records a calculation touches — two species, some
 * moves, two items, two abilities — and the client builds a real `Dex` over
 * them and calls the same `calculate` the server would.
 *
 * This is the whole reason `Dex` is an interface in `core` rather than a
 * concrete loader: the calculator cannot tell that this one holds nine records
 * instead of nine thousand.
 */

export type DexPayload = {
  readonly species: readonly Species[]
  readonly moves: readonly Move[]
  readonly items: readonly Item[]
  readonly abilities: readonly Ability[]
  readonly formats: readonly Format[]
}

export function miniDex(payload: DexPayload): Dex {
  const species = new Map(payload.species.map((record) => [record.id as string, record]))
  const moves = new Map(payload.moves.map((record) => [record.id as string, record]))
  const items = new Map(payload.items.map((record) => [record.id as string, record]))
  const abilities = new Map(payload.abilities.map((record) => [record.id as string, record]))
  const formats = new Map(payload.formats.map((record) => [record.id as string, record]))

  return {
    species: (id: SpeciesId) => species.get(id),
    move: (id: MoveId) => moves.get(id),
    item: (id: ItemId) => items.get(id),
    ability: (id: AbilityId) => abilities.get(id),
    format: (id: FormatId) => formats.get(id),
    allSpecies: () => payload.species,
    allMoves: () => payload.moves,
    allItems: () => payload.items,
    allAbilities: () => payload.abilities,
    allFormats: () => payload.formats,
    /**
     * The panel never asks. A learnset is a legality question and legality is
     * answered on the server against the full dataset.
     */
    learnset: () => [],
  }
}
