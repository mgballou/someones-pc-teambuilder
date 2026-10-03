import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATASET_FILES } from '../../src/dataset'
import { ingest } from '../../src/ingest/pipeline'
import { writeDataset } from '../../src/ingest/write'
import { FakePokeApiClient } from '../../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index'

const result = await ingest(FakePokeApiClient.of(SAMPLE_PAYLOADS), { concurrency: 2 })
const dataDir = join(await mkdtemp(join(tmpdir(), 'spc-write-')), 'nested', 'data')
const written = await writeDataset(dataDir, result)

const read = async (file: string): Promise<string> => readFile(join(dataDir, file), 'utf8')

describe('writeDataset', () => {
  it('creates the folder and writes one file per record type', async () => {
    expect((await readdir(dataDir)).sort()).toEqual(Object.values(DATASET_FILES).sort())
  })

  it.each([
    ['species', DATASET_FILES.species],
    ['moves', DATASET_FILES.moves],
    ['items', DATASET_FILES.items],
    ['abilities', DATASET_FILES.abilities],
    ['learnsets', DATASET_FILES.learnsets],
  ] as const)('writes %s so it parses back to what the ingest produced', async (key, file) => {
    expect(JSON.parse(await read(file))).toEqual(result[key])
  })

  it.each(Object.values(DATASET_FILES))(
    'writes %s on one line with a final newline',
    async (file) => {
      expect(await read(file)).toMatch(/^[^\n]+\n$/)
    },
  )

  it.each(written.map((entry) => [entry.file, entry] as const))(
    'reports the true size of %s',
    async (file, entry) => {
      expect(entry.bytes).toBe((await stat(join(dataDir, file))).size)
    },
  )

  it('counts records per file, and learnsets per form', () => {
    expect(written.map(({ file, records }) => [file, records])).toEqual([
      [DATASET_FILES.species, result.species.length],
      [DATASET_FILES.moves, result.moves.length],
      [DATASET_FILES.items, result.items.length],
      [DATASET_FILES.abilities, result.abilities.length],
      [DATASET_FILES.learnsets, Object.keys(result.learnsets.species).length],
    ])
  })
})
