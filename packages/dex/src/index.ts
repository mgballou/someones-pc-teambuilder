/**
 * The public surface of `@spc/dex`.
 *
 * The web app wants `dex()` and nothing else. Everything below it is exported
 * so that a test, a script or a future ingest can reach the pieces without
 * importing `@spc/dex/src/...`, which is a layering break and lint says so.
 */

// The dataset and the `Dex` it becomes
export { buildDex, dex, DATASET_FILES } from './dataset'

/**
 * `loadDataset` and `defaultDataDir` are deliberately NOT re-exported here.
 * They read the filesystem, and a bundler that follows this barrel would try
 * to resolve their `import.meta.url` path and fail the web build. The ingest
 * and its tests import `./disk` directly; nothing outside this package needs
 * it, because consumers want `dex()`.
 */
export type { DexDataset, LearnsetTable } from './dataset'

// The committed dataset as a plain value
export { BUNDLED_DATASET } from './bundled'

// The network boundary
export { FakePokeApiClient, LivePokeApiClient, POKEAPI_BASE_URL } from './pokeapi/client'
export type { FakePayloads, LivePokeApiClientOptions, PokeApiClient } from './pokeapi/client'

// The ingest, for `pnpm ingest` and for tests that drive it with a fake client
export { ingest } from './ingest/pipeline'
export type { IngestOptions, IngestProgress, IngestResult } from './ingest/pipeline'
export { writeDataset } from './ingest/write'
export type { WrittenFile } from './ingest/write'

// Typed errors
export { DatasetError, IngestError, PokeApiError } from './errors'
export type { DatasetFault, IngestFault, PokeApiFailure } from './errors'
