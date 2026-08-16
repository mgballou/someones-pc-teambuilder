/**
 * The public surface of `@spc/dex`.
 *
 * The web app wants `dex()` and nothing else. Everything below it is exported
 * so that a test, a script or a future ingest can reach the pieces without
 * importing `@spc/dex/src/...`, which is a layering break and lint says so.
 */

// The dataset and the `Dex` it becomes
export { buildDex, dex, loadDataset, defaultDataDir, DATASET_FILES } from './dataset.js'
export type { DexDataset, LearnsetTable } from './dataset.js'

// Curated formats, which PokéAPI cannot supply
export { curatedFormats } from './formats.js'

// The network boundary
export { FakePokeApiClient, LivePokeApiClient, POKEAPI_BASE_URL } from './pokeapi/client.js'
export type { FakePayloads, LivePokeApiClientOptions, PokeApiClient } from './pokeapi/client.js'

// The ingest, for `pnpm ingest` and for tests that drive it with a fake client
export { ingest } from './ingest/pipeline.js'
export type { IngestOptions, IngestProgress, IngestResult } from './ingest/pipeline.js'
export { writeDataset } from './ingest/write.js'
export type { WrittenFile } from './ingest/write.js'

// Typed errors
export { DatasetError, IngestError, PokeApiError } from './errors.js'
export type { DatasetFault, IngestFault, PokeApiFailure } from './errors.js'
