import { describe, expect, it } from 'vitest'
import { titleCase, titleWords } from '../../src/ingest/text'

describe('titleWords', () => {
  it('names the Ruin abilities the way the games do', () => {
    expect(titleWords('beads-of-ruin')).toBe('Beads of Ruin')
  })

  it('does the same for the other three', () => {
    const names = ['sword-of-ruin', 'vessel-of-ruin', 'tablets-of-ruin'].map(titleWords)
    expect(names).toEqual(['Sword of Ruin', 'Vessel of Ruin', 'Tablets of Ruin'])
  })

  it('lowercases "to"', () => {
    expect(titleWords('zero-to-hero')).toBe('Zero to Hero')
  })

  it('lowercases "as"', () => {
    expect(titleWords('good-as-gold')).toBe('Good as Gold')
  })

  it('lowercases "the" mid-name', () => {
    expect(titleWords('light-that-burns-the-sky')).toBe('Light That Burns the Sky')
  })

  it('capitalizes a minor word that starts the name', () => {
    expect(titleWords('a-good-name')).toBe('A Good Name')
  })

  it('leaves the particle in Bulk Up alone', () => {
    expect(titleWords('bulk-up')).toBe('Bulk Up')
  })

  it('leaves the particle in Knock Off alone', () => {
    expect(titleWords('knock-off')).toBe('Knock Off')
  })

  it('leaves the particle in Wimp Out alone', () => {
    expect(titleWords('wimp-out')).toBe('Wimp Out')
  })

  it('leaves the particle in Lock On alone', () => {
    expect(titleWords('lock-on')).toBe('Lock On')
  })

  it('leaves an ordinary name unchanged', () => {
    expect(titleWords('swords-dance')).toBe('Swords Dance')
  })
})

describe('titleCase', () => {
  it('keeps hyphens, because form names read that way', () => {
    expect(titleCase('rapid-strike')).toBe('Rapid-Strike')
  })

  it('does not apply the minor-word rule to a form name', () => {
    expect(titleCase('wellspring-mask')).toBe('Wellspring-Mask')
  })
})
