import { describe, expect, it } from 'vitest'
import type { Dex } from '../../src/index'
import { toSlug } from '../../src/index'
import {
  labelFromSlug,
  labelResolvesTo,
  primarySlug,
  resolveAbility,
  resolveItem,
  resolveMove,
  resolveSpecies,
  slugCandidates,
} from '../../src/showdown/index'
import { fixtureDex } from '../fixtures/dex'

describe('slugCandidates', () => {
  it('trims before slugging', () => {
    expect(slugCandidates('  Garchomp \t')).toEqual(['garchomp'])
  })

  it('treats a curly apostrophe like a straight one', () => {
    expect(slugCandidates('Farfetch’d')).toEqual(['farfetch-d', 'farfetchd'])
  })

  it('gives one empty candidate for blank text', () => {
    expect(slugCandidates('   ')).toEqual([''])
  })
})

describe('primarySlug', () => {
  it('is the plain reading', () => {
    expect(primarySlug("Farfetch'd")).toBe('farfetch-d')
  })
})

describe('labelResolvesTo', () => {
  it('holds for the display name of an id', () => {
    expect(labelResolvesTo('Landorus-Therian', 'landorus-therian')).toBe(true)
  })

  it('holds for the apostrophe-deleted reading', () => {
    expect(labelResolvesTo("Farfetch'd", 'farfetchd')).toBe(true)
  })

  it('does not hold for another form of the same species', () => {
    expect(labelResolvesTo('Landorus', 'landorus-therian')).toBe(false)
  })
})

describe('labelFromSlug', () => {
  it('capitalizes each part', () => {
    expect(labelFromSlug('landorus-therian', '-')).toBe('Landorus-Therian')
  })

  it('joins with the separator given', () => {
    expect(labelFromSlug('choice-band', ' ')).toBe('Choice Band')
  })

  it('keeps an empty part rather than collapsing it', () => {
    expect(labelFromSlug('a--b', '-')).toBe('A--B')
  })

  it.each(['landorus-therian', 'choice-band', 'u-turn', 'porygon2'])(
    'round-trips %s through toSlug',
    (id) => {
      expect(toSlug(labelFromSlug(id, ' '))).toBe(id)
    },
  )
})

describe('resolving malformed text', () => {
  const resolvers = [
    { kind: 'species', resolve: (text: string) => resolveSpecies(fixtureDex, text) },
    { kind: 'move', resolve: (text: string) => resolveMove(fixtureDex, text) },
    { kind: 'item', resolve: (text: string) => resolveItem(fixtureDex, text) },
    { kind: 'ability', resolve: (text: string) => resolveAbility(fixtureDex, text) },
  ] as const

  it.each(resolvers)('gives null for an unknown $kind', ({ resolve }) => {
    expect(resolve('Missingno')).toBeNull()
  })

  it.each(resolvers)('gives null for a blank $kind', ({ resolve }) => {
    expect(resolve('   ')).toBeNull()
  })

  it.each(resolvers)('gives null for punctuation alone as a $kind', ({ resolve }) => {
    expect(resolve("'.-")).toBeNull()
  })

  it('reads a form written out in full', () => {
    expect(resolveSpecies(fixtureDex, 'Landorus Incarnate')).toBe('landorus-incarnate')
  })

  it('does not resolve a move name as a species', () => {
    expect(resolveSpecies(fixtureDex, 'Earthquake')).toBeNull()
  })
})

describe('resolving by name', () => {
  it('reads a move by its display name', () => {
    expect(resolveMove(fixtureDex, 'Swords Dance')).toBe('swords-dance')
  })

  it('reads an item by its display name', () => {
    expect(resolveItem(fixtureDex, 'choice band')).toBe('choice-band')
  })

  it('reads an ability by its display name', () => {
    expect(resolveAbility(fixtureDex, 'Rough Skin')).toBe('rough-skin')
  })

  it('reads a species keyed differently from its name', () => {
    const renamed: Dex = {
      ...fixtureDex,
      allSpecies: () =>
        fixtureDex
          .allSpecies()
          .map((species) =>
            species.id === 'garchomp' ? { ...species, name: 'Land Shark' } : species,
          ),
    }

    expect(resolveSpecies(renamed, 'Land Shark')).toBe('garchomp')
  })
})
