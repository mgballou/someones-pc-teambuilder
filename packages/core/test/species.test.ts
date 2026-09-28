import { describe, expect, it } from 'vitest'
import type { Species } from '../src/index'
import {
  baseStatTotal,
  displayName,
  isAvailableIn,
  isFullyEvolved,
  requireSpecies,
  speciesId,
} from '../src/index'
import { fixtureDex } from './fixtures/dex'

const species = (id: string): Species => requireSpecies(fixtureDex, speciesId(id))

describe('displayName', () => {
  it('is the bare name for a base form', () => {
    expect(displayName({ ...species('garchomp'), formName: null })).toBe('Garchomp')
  })

  it('joins the form label with a hyphen', () => {
    expect(displayName({ ...species('garchomp'), formName: 'Mega' })).toBe('Garchomp-Mega')
  })

  it('tells two forms of one species apart', () => {
    expect(displayName(species('landorus-therian'))).not.toBe(
      displayName(species('landorus-incarnate')),
    )
  })
})

describe('isAvailableIn', () => {
  it('holds for a form Generation 9 carries', () => {
    expect(isAvailableIn(species('garchomp'), 9)).toBe(true)
  })

  it('does not hold for a form Generation 9 left out', () => {
    expect(isAvailableIn(species('pidgeot'), 9)).toBe(false)
  })

  it('does not hold for a generation the dataset never read', () => {
    expect(isAvailableIn(species('garchomp'), 8)).toBe(false)
  })

  it('reads the list, not the generation a form was introduced in', () => {
    expect(isAvailableIn(species('pidgeot'), species('pidgeot').generation)).toBe(false)
  })
})

describe('isFullyEvolved', () => {
  it('holds for a Pokémon that cannot evolve', () => {
    expect(isFullyEvolved(species('garchomp'))).toBe(true)
  })

  it('does not hold for a Pokémon that can', () => {
    expect(isFullyEvolved(species('dusclops'))).toBe(false)
  })
})

describe('baseStatTotal', () => {
  it('sums the six base stats', () => {
    expect(baseStatTotal(species('garchomp'))).toBe(600)
  })

  it('counts every stat once', () => {
    expect(
      baseStatTotal({
        ...species('garchomp'),
        baseStats: { hp: 1, atk: 2, def: 4, spa: 8, spd: 16, spe: 32 },
      }),
    ).toBe(63)
  })
})
