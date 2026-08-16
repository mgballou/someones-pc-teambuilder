import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Ability, Item, Move, Species } from '@spc/core'
import { SHIPPED_FORMATS } from '@spc/core'
import type { DexDataset, LearnsetTable } from './dataset'
import { DATASET_FILES } from './dataset'
import { DatasetError } from './errors'

/**
 * Reading the dataset off disk.
 *
 * Deliberately separate from `dataset.ts`. A bundler statically analyzes every
 * module it pulls in, and `new URL('../data/', import.meta.url)` is a path it
 * cannot resolve — so merely *having* this function in the same file as
 * `dex()` breaks the web build, whether or not anything calls it. The app uses
 * `bundled.ts`; the ingest and its tests use this.
 */

/** Where the committed dataset lives, relative to this module. */
export function defaultDataDir(): string {
  return fileURLToPath(new URL('../data/', import.meta.url))
}

export function loadDataset(dataDir: string = defaultDataDir()): DexDataset {
  return {
    species: readJson<readonly Species[]>(dataDir, DATASET_FILES.species),
    moves: readJson<readonly Move[]>(dataDir, DATASET_FILES.moves),
    items: readJson<readonly Item[]>(dataDir, DATASET_FILES.items),
    abilities: readJson<readonly Ability[]>(dataDir, DATASET_FILES.abilities),
    learnsets: readJson<LearnsetTable>(dataDir, DATASET_FILES.learnsets),
    formats: SHIPPED_FORMATS,
  }
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
