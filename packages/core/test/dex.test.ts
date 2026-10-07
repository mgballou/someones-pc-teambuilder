import { describe, expect, it } from 'vitest'
import { abilityId, formatId, itemId, moveId, speciesId } from '../src/ids'
import { MissingFromDex, requireFormat, requireMove, requireSpecies } from '../src/dex'
import { fixtureDex } from './fixtures/dex'

describe('Dex requirements', () => {
  it('returns a species when it exists', () => {
    expect(requireSpecies(fixtureDex, speciesId('garchomp'))).toBe(
      fixtureDex.species(speciesId('garchomp')),
    )
  })

  it('returns a move when it exists', () => {
    expect(requireMove(fixtureDex, moveId('earthquake'))).toBe(
      fixtureDex.move(moveId('earthquake')),
    )
  })

  it('returns a format when it exists', () => {
    expect(requireFormat(fixtureDex, formatId('vgc-reg-h'))).toBe(
      fixtureDex.format(formatId('vgc-reg-h')),
    )
  })

  it('throws a typed error when a species is missing', () => {
    expect(() => requireSpecies(fixtureDex, speciesId('missing-species'))).toThrowError(
      'No species in the dataset with id "missing-species"',
    )
  })

  it('throws a typed error when a move is missing', () => {
    expect(() => requireMove(fixtureDex, moveId('missing-move'))).toThrowError(
      'No move in the dataset with id "missing-move"',
    )
  })

  it('throws a typed error when a format is missing', () => {
    expect(() => requireFormat(fixtureDex, formatId('missing-format'))).toThrowError(
      'No format in the dataset with id "missing-format"',
    )
  })
})

describe('MissingFromDex', () => {
  it.each([
    [MissingFromDex.species(speciesId('missing-species')), 'species', 'missing-species'],
    [MissingFromDex.move(moveId('missing-move')), 'move', 'missing-move'],
    [MissingFromDex.item(itemId('missing-item')), 'item', 'missing-item'],
    [MissingFromDex.ability(abilityId('missing-ability')), 'ability', 'missing-ability'],
    [MissingFromDex.format(formatId('missing-format')), 'format', 'missing-format'],
  ] as const)('records the missing %s id', (error, kind, id) => {
    expect(error).toMatchObject({
      name: 'MissingFromDex',
      kind,
      id,
      message: `No ${kind} in the dataset with id "${id}"`,
    })
  })
})
