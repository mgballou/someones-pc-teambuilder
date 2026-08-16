/**
 * The built dataset, and the `Dex` it becomes.
 *
 * `Dex` lookups are synchronous and total-by-id, so all the resolving happens
 * exactly once: read five JSON files, build five maps, hand back an object of
 * closures. Nothing here validates a shape. The zod boundary is `pokeapi/`,
 * this file reads an artifact the ingest wrote from already-typed values, and
 * re-checking thirteen hundred species on every process start would cost real
 * milliseconds to prove something the type system already knows.
 */

import type { Ability, Dex, Format, Item, Move, MoveId, Species } from '@spc/core'
import { moveId } from '@spc/core'
import { BUNDLED_DATASET } from './bundled'
/**
 * Learnsets, indexed.
 *
 * Written as an index into a shared move table rather than as
 * `Record<species, string[]>`. Thirteen hundred forms times a hundred and
 * fifty move names is a two-and-a-half megabyte file of repeated strings; the
 * same data as offsets is under a megabyte, and the file is committed.
 */
export type LearnsetTable = {
  readonly moves: readonly string[]
  readonly species: Readonly<Record<string, readonly number[]>>
}

export type DexDataset = {
  readonly species: readonly Species[]
  readonly moves: readonly Move[]
  readonly items: readonly Item[]
  readonly abilities: readonly Ability[]
  readonly learnsets: LearnsetTable
  readonly formats: readonly Format[]
}

export const DATASET_FILES = {
  species: 'species.json',
  moves: 'moves.json',
  items: 'items.json',
  abilities: 'abilities.json',
  learnsets: 'learnsets.json',
} as const

export function buildDex(dataset: DexDataset): Dex {
  const species = index(dataset.species)
  const moves = index(dataset.moves)
  const items = index(dataset.items)
  const abilities = index(dataset.abilities)
  const formats = index(dataset.formats)
  const learnsets = expandLearnsets(dataset.learnsets)
  const empty: readonly MoveId[] = []

  return {
    species: (id) => species.get(id),
    move: (id) => moves.get(id),
    item: (id) => items.get(id),
    ability: (id) => abilities.get(id),
    format: (id) => formats.get(id),
    allSpecies: () => dataset.species,
    allMoves: () => dataset.moves,
    allItems: () => dataset.items,
    allAbilities: () => dataset.abilities,
    allFormats: () => dataset.formats,
    learnset: (id) => learnsets.get(id) ?? empty,
  }
}

let cached: Dex | null = null

/**
 * The committed dataset as a `Dex`, built once per process.
 *
 * Memoized because it is the only sensible way to use it — the maps are
 * immutable and building them twice buys nothing. Tests that want a different
 * dataset call `buildDex` directly.
 */
export function dex(): Dex {
  cached ??= buildDex(BUNDLED_DATASET)
  return cached
}

function index<T extends { readonly id: string }>(records: readonly T[]): ReadonlyMap<string, T> {
  return new Map(records.map((record) => [record.id, record]))
}

function expandLearnsets(table: LearnsetTable): ReadonlyMap<string, readonly MoveId[]> {
  const names = table.moves.map(moveId)
  const expanded = new Map<string, readonly MoveId[]>()
  for (const [id, offsets] of Object.entries(table.species)) {
    const learnable: MoveId[] = []
    for (const offset of offsets) {
      const name = names[offset]
      if (name !== undefined) learnable.push(name)
    }
    expanded.set(id, learnable)
  }
  return expanded
}
