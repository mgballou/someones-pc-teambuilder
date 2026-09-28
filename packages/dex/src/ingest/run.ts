/**
 * `pnpm ingest`.
 *
 * Walks PokéAPI once and rewrites `packages/dex/data/`. Six thousand requests,
 * so it caches every response under `.cache/` and a second run is disk-bound
 * rather than network-bound. Concurrency is eight by default, which is brisk
 * without being rude to a free API; `DEX_INGEST_CONCURRENCY` lowers it.
 *
 * Only the wiring lives here, because importing this file starts an ingest.
 * The work is `runIngest` in `command.ts`, which is what the tests drive.
 */

import { fileURLToPath } from 'node:url'
import { LivePokeApiClient } from '../pokeapi/client'
import { concurrencyFrom, runIngest } from './command'

const concurrency = concurrencyFrom(process.env['DEX_INGEST_CONCURRENCY'])
const cacheDir = fileURLToPath(new URL('../../.cache/', import.meta.url))
const dataDir = fileURLToPath(new URL('../../data/', import.meta.url))

runIngest({
  client: LivePokeApiClient.create({ cacheDir, concurrency }),
  dataDir,
  concurrency,
  print: (text) => process.stdout.write(text),
  now: () => Date.now(),
}).catch((error: unknown) => {
  process.exitCode = 1
  process.stderr.write(`\ningest failed: ${error instanceof Error ? error.stack : String(error)}\n`)
})
