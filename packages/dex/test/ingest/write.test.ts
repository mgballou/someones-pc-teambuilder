import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DATASET_FILES } from '../../src/dataset'
import { writeDataset } from '../../src/ingest/write'

describe('writeDataset', () => {
  let dataDir: string | undefined

  afterEach(async () => {
    if (dataDir !== undefined) await rm(dataDir, { recursive: true, force: true })
  })

  it('writes each dataset as compact JSON and reports record and byte counts', async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'spc-dataset-'))
    const result = await writeDataset(join(dataDir, 'nested', 'data'), {
      species: [],
      moves: [],
      items: [],
      abilities: [],
      learnsets: { moves: ['tackle'], species: { pikachu: [0], eevee: [] } },
    })

    expect(result).toEqual([
      { file: DATASET_FILES.species, records: 0, bytes: 3 },
      { file: DATASET_FILES.moves, records: 0, bytes: 3 },
      { file: DATASET_FILES.items, records: 0, bytes: 3 },
      { file: DATASET_FILES.abilities, records: 0, bytes: 3 },
      { file: DATASET_FILES.learnsets, records: 2, bytes: 58 },
    ])
    expect(await readFile(join(dataDir, 'nested', 'data', DATASET_FILES.learnsets), 'utf8')).toBe(
      '{"moves":["tackle"],"species":{"pikachu":[0],"eevee":[]}}\n',
    )
  })
})
