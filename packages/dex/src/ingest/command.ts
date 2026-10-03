/**
 * What `pnpm ingest` does, apart from the process it runs in.
 *
 * `run.ts` hands this the live client, the real data folder, stdout and the
 * clock. A test hands it the fake client, a temporary folder and an array, and
 * reads back what was written.
 */

import type { PokeApiClient } from '../pokeapi/client'
import { ingest } from './pipeline'
import type { WrittenFile } from './write'
import { writeDataset } from './write'

export const DEFAULT_CONCURRENCY = 8

/** `DEX_INGEST_CONCURRENCY`, or the default when it is unset or not a number. */
export function concurrencyFrom(value: string | undefined): number {
  const requested = Number.parseInt(value ?? '', 10)
  return Number.isNaN(requested) ? DEFAULT_CONCURRENCY : requested
}

export type IngestCommandOptions = {
  readonly client: PokeApiClient
  readonly dataDir: string
  readonly concurrency: number
  readonly print: (text: string) => void
  readonly now: () => number
}

export async function runIngest({
  client,
  dataDir,
  concurrency,
  print,
  now,
}: IngestCommandOptions): Promise<readonly WrittenFile[]> {
  const started = now()
  const result = await ingest(client, {
    concurrency,
    onProgress: ({ stage, done, total }) => {
      print(`\r${stage.padEnd(16)} ${String(done).padStart(5)} / ${total}   `)
      if (done === total) print('\n')
    },
  })

  const written = await writeDataset(dataDir, result)
  const seconds = Math.round((now() - started) / 1000)

  print(`\nWrote ${dataDir} in ${seconds}s\n`)
  for (const file of written) {
    const kb = Math.round(file.bytes / 1024)
    print(`  ${file.file.padEnd(16)} ${String(file.records).padStart(5)} records  ${kb} KB\n`)
  }
  return written
}
