import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SHIPPED_FORMATS } from '@spc/core'
import { DATASET_FILES } from '../src/dataset'
import { defaultDataDir, loadDataset } from '../src/disk'
import { DatasetError } from '../src/errors'
import { ingest } from '../src/ingest/pipeline'
import { writeDataset } from '../src/ingest/write'
import { FakePokeApiClient } from '../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../src/pokeapi/fixtures/index'

const result = await ingest(FakePokeApiClient.of(SAMPLE_PAYLOADS), { concurrency: 2 })
const dataDir = await mkdtemp(join(tmpdir(), 'spc-disk-'))
await writeDataset(dataDir, result)

function failure(load: () => unknown): unknown {
  try {
    load()
  } catch (error) {
    return error
  }
  return undefined
}

describe('loadDataset', () => {
  it('reads back what writeDataset wrote', () => {
    expect(loadDataset(dataDir)).toEqual({ ...result, formats: SHIPPED_FORMATS })
  })

  it('reads a folder given with a trailing slash', () => {
    expect(loadDataset(`${dataDir}/`).species).toEqual(result.species)
  })

  it('reads the committed dataset by default', () => {
    expect(loadDataset().species.length).toBeGreaterThan(1000)
  })

  it('finds the committed dataset next to the package source', () => {
    expect(defaultDataDir()).toMatch(/packages\/dex\/data\/$/)
  })

  it('throws a DatasetError when a file is missing', () => {
    expect(failure(() => loadDataset(join(dataDir, 'absent')))).toBeInstanceOf(DatasetError)
  })

  it('names the file it could not read', () => {
    expect(failure(() => loadDataset(join(dataDir, 'absent')))).toMatchObject({
      fault: { kind: 'unreadable', path: join(dataDir, 'absent', DATASET_FILES.species) },
    })
  })

  it('names the file that is not JSON', async () => {
    const broken = await mkdtemp(join(tmpdir(), 'spc-disk-broken-'))
    await writeDataset(broken, result)
    await writeFile(join(broken, DATASET_FILES.items), '{"truncated": ')
    expect(failure(() => loadDataset(broken))).toMatchObject({
      fault: { kind: 'unparsable', path: join(broken, DATASET_FILES.items) },
    })
  })
})
