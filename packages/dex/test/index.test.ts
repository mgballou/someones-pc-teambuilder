import { describe, expect, it } from 'vitest'
import { speciesId } from '@spc/core'
import * as dexPackage from '../src/index'

describe('the @spc/dex entry point', () => {
  it('exports exactly its public surface', () => {
    expect(Object.keys(dexPackage).sort()).toEqual([
      'BUNDLED_DATASET',
      'DATASET_FILES',
      'DatasetError',
      'FakePokeApiClient',
      'IngestError',
      'LivePokeApiClient',
      'POKEAPI_BASE_URL',
      'PokeApiError',
      'buildDex',
      'dex',
      'ingest',
      'writeDataset',
    ])
  })

  it('leaves the filesystem reader out, so a bundler never follows it', () => {
    expect('loadDataset' in dexPackage).toBe(false)
  })

  it('hands back a Dex over the committed dataset', () => {
    expect(dexPackage.dex().species(speciesId('garchomp'))?.name).toBe('Garchomp')
  })
})
