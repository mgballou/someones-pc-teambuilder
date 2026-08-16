import { describe, expect, it } from 'vitest'
import { abilityId, formatId, itemId, moveId, speciesId } from '@spc/core'
import { buildDex, loadDataset } from '../src/dataset.js'
import { curatedFormats } from '../src/formats.js'
import { FakePokeApiClient } from '../src/pokeapi/client.js'
import { SAMPLE_PAYLOADS } from '../src/pokeapi/fixtures/index.js'
import { ingest } from '../src/ingest/pipeline.js'

const result = await ingest(FakePokeApiClient.of(SAMPLE_PAYLOADS), { concurrency: 2 })
const dex = buildDex({ ...result, formats: curatedFormats(result.species) })

describe('lookups', () => {
  it('finds a species by id', () => {
    expect(dex.species(speciesId('landorus-therian'))?.formName).toBe('Therian')
  })

  it('finds a move by id', () => {
    expect(dex.move(moveId('earthquake'))?.basePower).toBe(100)
  })

  it('finds an item by id', () => {
    expect(dex.item(itemId('eviolite'))?.effect.kind).toBe('eviolite')
  })

  it('finds an ability by id', () => {
    expect(dex.ability(abilityId('intimidate'))?.name).toBe('Intimidate')
  })

  it('finds a format by id', () => {
    expect(dex.format(formatId('vgc-2026-reg-h'))?.bringSize).toBe(4)
  })

  it('returns undefined for an id that is not there', () => {
    expect(dex.species(speciesId('missingno'))).toBeUndefined()
  })
})

describe('learnsets', () => {
  it('round-trips through the offset table', () => {
    expect(dex.learnset(speciesId('landorus-therian'))).toContain(moveId('earthquake'))
  })

  it('returns an empty list for a species with no learnset', () => {
    expect(dex.learnset(speciesId('missingno'))).toEqual([])
  })
})

describe('curated formats', () => {
  it('fills Regulation G restricted list from the dataset', () => {
    const regG = dex.format(formatId('vgc-2026-reg-g'))
    expect(regG?.legality.maxRestricted).toBe(2)
  })

  it('carries a source on every format', () => {
    expect(dex.allFormats().every((format) => format.source.citation.length > 0)).toBe(true)
  })
})

describe('the committed dataset', () => {
  const dataset = loadDataset()

  it('has every form', () => {
    expect(dataset.species.length).toBeGreaterThan(1300)
  })

  it('has every move', () => {
    expect(dataset.moves.length).toBeGreaterThan(900)
  })

  it('has every item', () => {
    expect(dataset.items.length).toBeGreaterThan(2000)
  })

  it('has every ability', () => {
    expect(dataset.abilities.length).toBeGreaterThan(350)
  })

  it('separates Landorus-Therian from Landorus-Incarnate', () => {
    const real = buildDex(dataset)
    expect(real.species(speciesId('landorus-therian'))?.baseStats.atk).toBe(145)
  })

  it('knows Garchomp learns Earthquake', () => {
    const real = buildDex(dataset)
    expect(real.learnset(speciesId('garchomp'))).toContain(moveId('earthquake'))
  })

  it('keeps Dusclops evolvable, for Eviolite', () => {
    const real = buildDex(dataset)
    expect(real.species(speciesId('dusclops'))?.canEvolve).toBe(true)
  })
})
