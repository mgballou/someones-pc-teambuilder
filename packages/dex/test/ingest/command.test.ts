import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATASET_FILES } from '../../src/dataset'
import { loadDataset } from '../../src/disk'
import { concurrencyFrom, DEFAULT_CONCURRENCY, runIngest } from '../../src/ingest/command'
import { FakePokeApiClient } from '../../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index'

const dataDir = await mkdtemp(join(tmpdir(), 'spc-command-'))
const printed: string[] = []
const clock = [1_000, 4_400]
const written = await runIngest({
  client: FakePokeApiClient.of(SAMPLE_PAYLOADS),
  dataDir,
  concurrency: 2,
  print: (text) => printed.push(text),
  now: () => clock.shift() ?? 0,
})
const output = printed.join('')

describe('runIngest', () => {
  it('writes the dataset into the folder it was given', async () => {
    expect((await readdir(dataDir)).sort()).toEqual(Object.values(DATASET_FILES).sort())
  })

  it('writes a dataset that loads back', () => {
    expect(loadDataset(dataDir).species).toHaveLength(4)
  })

  it.each(['abilities', 'moves', 'items', 'pokemon-species', 'pokemon'])(
    'reports progress for the %s stage of the walk',
    (stage) => {
      expect(output).toMatch(new RegExp(`\\r${stage.padEnd(16)}\\s+\\d+ / \\d+`))
    },
  )

  it('reports the elapsed time from the clock it was given', () => {
    expect(output).toContain(`Wrote ${dataDir} in 3s`)
  })

  it.each(Object.values(DATASET_FILES))('prints a line for %s', (file) => {
    expect(output).toMatch(new RegExp(`  ${file.replace('.', '\\.')} +\\d+ records  \\d+ KB`))
  })

  it('returns what it wrote', () => {
    expect(written.map((entry) => entry.file)).toEqual(Object.values(DATASET_FILES))
  })
})

describe('concurrencyFrom', () => {
  it('reads a number', () => {
    expect(concurrencyFrom('3')).toBe(3)
  })

  it('falls back to the default when unset', () => {
    expect(concurrencyFrom(undefined)).toBe(DEFAULT_CONCURRENCY)
  })

  it('falls back to the default when not a number', () => {
    expect(concurrencyFrom('lots')).toBe(DEFAULT_CONCURRENCY)
  })
})
