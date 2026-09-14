import { describe, expect, it } from 'vitest'
import { abilityId, speciesId } from '@spc/core'
import { FakePokeApiClient } from '../../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index'
import { megaStonesByHolder } from '../../src/ingest/items'
import { evolvingSpeciesFrom, normalizeSpecies } from '../../src/ingest/species'
import type { PokemonSpeciesResponse } from '../../src/pokeapi/schema'

const client = FakePokeApiClient.of(SAMPLE_PAYLOADS)

async function speciesResponses(): Promise<readonly PokemonSpeciesResponse[]> {
  const names = await client.speciesIndex()
  return Promise.all(names.map((name) => client.pokemonSpecies(name)))
}

async function normalize(pokemonName: string, speciesName: string) {
  return normalizeNamed(pokemonName, speciesName, pokemonName)
}

/**
 * The same, under a different form name. `classify` reads the form off the
 * `pokemon` name, and the sample payloads hold no Mega or Totem form to read.
 */
async function normalizeNamed(pokemonName: string, speciesName: string, as: string) {
  const all = await speciesResponses()
  return normalizeSpecies({
    pokemon: { ...(await client.pokemon(pokemonName)), name: as },
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

  /**
   * The form used to be tested last, so the base species won and twelve of the
   * ninety-seven Mega forms came out as something other than `mega` — Latios
   * -Mega as `sub-legendary`, Mewtwo-Mega-Y as `restricted`. A ban list naming
   * `mega` then missed them, and four Mega Evolutions were legal in Regulation
   * G. Landorus stands in for Latios here: same shape, and the fixture has it.
   */
  it('calls a Mega form a Mega even when its base species is sub-legendary', async () => {
    const mega = await normalizeNamed('landorus-therian', 'landorus', 'landorus-mega')
    expect(mega.classification).toBe('mega')
  })

  it('calls a Totem form a Totem the same way', async () => {
    const totem = await normalizeNamed('landorus-therian', 'landorus', 'landorus-totem')
    expect(totem.classification).toBe('totem')
  })
})

describe('availability', () => {
  it('records generation IX for a form Scarlet and Violet hold', async () => {
    const therian = await normalize('landorus-therian', 'landorus')
    expect(therian.availableIn).toEqual([9])
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
