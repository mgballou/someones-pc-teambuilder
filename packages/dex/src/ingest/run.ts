/**
 * `pnpm ingest`.
 *
 * Walks PokéAPI once and rewrites `packages/dex/data/`. Six thousand requests,
 * so it caches every response under `.cache/` and a second run is disk-bound
 * rather than network-bound. Concurrency is eight by default, which is brisk
 * without being rude to a free API; `DEX_INGEST_CONCURRENCY` lowers it.
 */

import { fileURLToPath } from 'node:url'
import { LivePokeApiClient } from '../pokeapi/client.js'
import { ingest } from './pipeline.js'
import { writeDataset } from './write.js'

const DEFAULT_CONCURRENCY = 8

async function main(): Promise<void> {
  const concurrency = Number.parseInt(process.env['DEX_INGEST_CONCURRENCY'] ?? '', 10)
  const cacheDir = fileURLToPath(new URL('../../.cache/', import.meta.url))
  const dataDir = fileURLToPath(new URL('../../data/', import.meta.url))

  const client = LivePokeApiClient.create({
    cacheDir,
    concurrency: Number.isNaN(concurrency) ? DEFAULT_CONCURRENCY : concurrency,
  })

  const started = Date.now()
  const result = await ingest(client, {
    concurrency: Number.isNaN(concurrency) ? DEFAULT_CONCURRENCY : concurrency,
    onProgress: ({ stage, done, total }) => {
      process.stdout.write(`\r${stage.padEnd(16)} ${String(done).padStart(5)} / ${total}   `)
      if (done === total) process.stdout.write('\n')
    },
  })

  const written = await writeDataset(dataDir, result)
  const seconds = Math.round((Date.now() - started) / 1000)

  process.stdout.write(`\nWrote ${dataDir} in ${seconds}s\n`)
  for (const file of written) {
    const kb = Math.round(file.bytes / 1024)
    process.stdout.write(`  ${file.file.padEnd(16)} ${String(file.records).padStart(5)} records  ${kb} KB\n`)
  }
}

main().catch((error: unknown) => {
  process.exitCode = 1
  process.stderr.write(`\ningest failed: ${error instanceof Error ? error.stack : String(error)}\n`)
})
