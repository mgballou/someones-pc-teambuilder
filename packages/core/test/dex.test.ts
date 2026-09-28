import { describe, expect, it } from 'vitest'
import {
  abilityId,
  formatId,
  itemId,
  MissingFromDex,
  moveId,
  requireFormat,
  requireMove,
  requireSpecies,
  speciesId,
} from '../src/index'
import { fixtureDex } from './fixtures/dex'

function caught(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error('expected the call to throw')
}

describe('requireSpecies', () => {
  it('returns the form the dataset holds', () => {
    expect(requireSpecies(fixtureDex, speciesId('landorus-therian')).id).toBe('landorus-therian')
  })

  it('does not fall back from a form to its base species', () => {
    expect(caught(() => requireSpecies(fixtureDex, speciesId('landorus')))).toBeInstanceOf(
      MissingFromDex,
    )
  })

  it('throws MissingFromDex for an unknown species', () => {
    expect(caught(() => requireSpecies(fixtureDex, speciesId('missingno')))).toBeInstanceOf(
      MissingFromDex,
    )
  })

  it('names the species it could not find', () => {
    expect(() => requireSpecies(fixtureDex, speciesId('missingno'))).toThrow(
      'No species in the dataset with id "missingno"',
    )
  })
})

describe('requireMove', () => {
  it('returns the move the dataset holds', () => {
    expect(requireMove(fixtureDex, moveId('earthquake')).name).toBe('Earthquake')
  })

  it('names the move it could not find', () => {
    expect(() => requireMove(fixtureDex, moveId('hyper-beam'))).toThrow(
      'No move in the dataset with id "hyper-beam"',
    )
  })
})

describe('requireFormat', () => {
  it('returns the format the dataset holds', () => {
    expect(requireFormat(fixtureDex, formatId('gen9-ou')).id).toBe('gen9-ou')
  })

  it('names the format it could not find', () => {
    expect(() => requireFormat(fixtureDex, formatId('vgc-reg-z'))).toThrow(
      'No format in the dataset with id "vgc-reg-z"',
    )
  })
})

describe('MissingFromDex', () => {
  const cases = [
    { kind: 'species', error: MissingFromDex.species(speciesId('missingno')), id: 'missingno' },
    { kind: 'move', error: MissingFromDex.move(moveId('hyper-beam')), id: 'hyper-beam' },
    { kind: 'item', error: MissingFromDex.item(itemId('bright-powder')), id: 'bright-powder' },
    { kind: 'ability', error: MissingFromDex.ability(abilityId('moody')), id: 'moody' },
    { kind: 'format', error: MissingFromDex.format(formatId('vgc-reg-z')), id: 'vgc-reg-z' },
  ] as const

  it.each(cases)('records the kind for a missing $kind', ({ kind, error }) => {
    expect(error.kind).toBe(kind)
  })

  it.each(cases)('records the id for a missing $kind', ({ error, id }) => {
    expect(error.id).toBe(id)
  })

  it.each(cases)('writes the message for a missing $kind', ({ kind, error, id }) => {
    expect(error.message).toBe(`No ${kind} in the dataset with id "${id}"`)
  })

  it.each(cases)('names itself for a missing $kind', ({ error }) => {
    expect(error.name).toBe('MissingFromDex')
  })

  it.each(cases)('is an Error for a missing $kind', ({ error }) => {
    expect(error).toBeInstanceOf(Error)
  })
})
