/** Writing the dataset out. Compact JSON, one file per record type. */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DATASET_FILES } from '../dataset'
import type { IngestResult } from './pipeline'

export type WrittenFile = {
  readonly file: string
  readonly records: number
  readonly bytes: number
}

/**
 * No indentation and no newlines. The dataset is a build artifact that happens
 * to be committed: it is read by a parser, never by a person, and prettier is
 * told to leave it alone.
 */
export async function writeDataset(
  dataDir: string,
  result: IngestResult,
): Promise<readonly WrittenFile[]> {
  await mkdir(dataDir, { recursive: true })
  return [
    await write(dataDir, DATASET_FILES.species, result.species, result.species.length),
    await write(dataDir, DATASET_FILES.moves, result.moves, result.moves.length),
    await write(dataDir, DATASET_FILES.items, result.items, result.items.length),
    await write(dataDir, DATASET_FILES.abilities, result.abilities, result.abilities.length),
    await write(
      dataDir,
      DATASET_FILES.learnsets,
      result.learnsets,
      Object.keys(result.learnsets.species).length,
    ),
  ]
}

async function write(
  dataDir: string,
  file: string,
  value: unknown,
  records: number,
): Promise<WrittenFile> {
  const body = JSON.stringify(value)
  await writeFile(join(dataDir, file), `${body}\n`, 'utf8')
  return { file, records, bytes: body.length + 1 }
}
