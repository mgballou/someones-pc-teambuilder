import { describe, expect, it } from 'vitest'
import { abilityId, speciesId } from '@spc/core'
import { FakePokeApiClient } from '../../src/pokeapi/client.js'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index.js'
import { megaStonesByHolder } from '../../src/ingest/items.js'
import { evolvingSpeciesFrom, normalizeSpecies } from '../../src/ingest/species.js'
import type { PokemonSpeciesResponse } from '../../src/pokeapi/schema.js'

const client = FakePokeApiClient.of(SAMPLE_PAYLOADS)

async function speciesResponses(): Promise<readonly PokemonSpeciesResponse[]> {
  const names = await client.speciesIndex()
  return Promise.all(names.map((name) => client.pokemonSpecies(name)))
}

async function normalize(pokemonName: string, speciesName: string) {
  const all = await speciesResponses()
  return normalizeSpecies({
    pokemon: await client.pokemon(pokemonName),
    species: await client.pokemonSpecies(speciesName),
    evolvingSpecies: evolvingSpeciesFrom(all),
    megaStonesByHolder: megaStonesByHolder(),
  })
}

describe('a form is its own species', () => {
  it('gives Landorus-Therian its own id', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.id).toBe(speciesId('landorus-therian'))
  })

  it('gives Landorus-Therian a form name', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.formName).toBe('Therian')
  })

  it('points Landorus-Therian at the default variety as its base', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.baseSpecies).toBe(speciesId('landorus-incarnate'))
  })

  it('shares one dex number across both forms', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    const incarnate = await normalize('landorus-incarnate', 'landorus')
    expect(therian.dexNumber).toBe(incarnate.dexNumber)
  })

  it('keeps the two forms base attack apart', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    const incarnate = await normalize('landorus-incarnate', 'landorus')
    expect(therian.baseStats.atk).not.toBe(incarnate.baseStats.atk)
  })

  it('keeps the two forms abilities apart', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.abilities).toEqual([abilityId('intimidate')])
  })
})

describe('classification', () => {
  it('reads a sub-legendary off the curated list', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.classification).toBe('sub-legendary')
  })

  it('leaves an ordinary species ordinary', async () => {
    const dusclops = await normalize('dusclops', 'dusclops')
    expect(dusclops.classification).toBe('ordinary')
  })
})

describe('canEvolve', () => {
  it('is true for a species something else evolves from', async () => {
    const dusclops = await normalize('dusclops', 'dusclops')
    expect(dusclops.canEvolve).toBe(true)
  })

  it('is false for a species nothing evolves from', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.canEvolve).toBe(false)
  })
})

describe('gimmicks', () => {
  it('denies Terastallization to an Ogerpon form', async () => {
    const ogerpon = await normalize('ogerpon-wellspring-mask', 'ogerpon')
    expect(ogerpon.gimmicks.canTerastallize).toBe(false)
  })

  it('allows Terastallization everywhere else', async () => {
    const dusclops = await normalize('dusclops', 'dusclops')
    expect(dusclops.gimmicks.canTerastallize).toBe(true)
  })
})

describe('units', () => {
  it('converts hectograms to kilograms', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.weightKg).toBe(68)
  })

  it('converts decimetres to metres', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.heightM).toBe(1.3)
  })
})
