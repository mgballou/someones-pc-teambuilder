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

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Ability, Dex, Format, Item, Move, MoveId, Species } from '@spc/core'
import { moveId } from '@spc/core'
import { DatasetError } from './errors.js'
import { curatedFormats } from './formats.js'

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

/** Where the committed dataset lives, relative to this module. */
export function defaultDataDir(): string {
  return fileURLToPath(new URL('../data/', import.meta.url))
}

export function loadDataset(dataDir: string = defaultDataDir()): DexDataset {
  const species = readJson<readonly Species[]>(dataDir, DATASET_FILES.species)
  return {
    species,
    moves: readJson<readonly Move[]>(dataDir, DATASET_FILES.moves),
    items: readJson<readonly Item[]>(dataDir, DATASET_FILES.items),
    abilities: readJson<readonly Ability[]>(dataDir, DATASET_FILES.abilities),
    learnsets: readJson<LearnsetTable>(dataDir, DATASET_FILES.learnsets),
    formats: curatedFormats(species),
  }
}

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
  cached ??= buildDex(loadDataset())
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

function readJson<T>(dataDir: string, file: string): T {
  const path = `${dataDir}${file}`
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (cause) {
    throw DatasetError.unreadable(path, cause)
  }
  try {
    /**
     * The one cast in the package. `JSON.parse` returns `any`-shaped data and
     * no type guard can express "this is the array the ingest wrote" without
     * walking every field, which is the re-validation CLAUDE.md forbids. The
     * artifact is generated from typed values by `src/ingest/write.ts`.
     */
    return JSON.parse(raw) as T
  } catch (cause) {
    throw DatasetError.unparsable(path, cause)
  }
}
