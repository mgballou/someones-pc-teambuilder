import type { Ability, Item, Move, Species } from '@spc/core'
import { SHIPPED_FORMATS } from '@spc/core'
import type { DexDataset, LearnsetTable } from './dataset'

import abilitiesJson from '../data/abilities.json'
import itemsJson from '../data/items.json'
import learnsetsJson from '../data/learnsets.json'
import movesJson from '../data/moves.json'
import speciesJson from '../data/species.json'

/**
 * The committed dataset, imported statically.
 *
 * `loadDataset` reads the same five files off disk, which is what the ingest
 * and its tests want. The web app cannot use that path: a bundler has to see
 * the dependency to include it, and `new URL('../data/', import.meta.url)` is
 * invisible to one. Importing the JSON makes the dataset part of the module
 * graph, so it works under Turbopack, in a serverless bundle, and anywhere
 * else there is no filesystem to read.
 *
 * The casts are the JSON boundary. These files are written by the ingest from
 * already-typed values and are validated there by zod, so re-checking 1,351
 * species on every process start would cost real milliseconds to prove
 * something that was proven when the file was written. A type guard cannot
 * express "this array was serialized from `Species[]`", which is why these are
 * the one place in the codebase that casts a parsed shape.
 */
export const BUNDLED_DATASET: DexDataset = {
  species: speciesJson as unknown as readonly Species[],
  moves: movesJson as unknown as readonly Move[],
  items: itemsJson as unknown as readonly Item[],
  abilities: abilitiesJson as unknown as readonly Ability[],
  learnsets: learnsetsJson as unknown as LearnsetTable,
  /**
   * Formats live in `@spc/core`, not here. They are a domain concept the
   * analysis layer depends on, they are hand-curated rather than ingested, and
   * a second copy in this package would be a second banlist to drift.
   */
  formats: SHIPPED_FORMATS,
}
