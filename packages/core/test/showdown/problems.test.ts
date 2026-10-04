import { describe, expect, it } from 'vitest'
import { abilityId, itemId, moveId, speciesId } from '../../src/index'
import type { ParseProblem } from '../../src/showdown/index'
import { describeProblem, parse, problemsOf, setsOf } from '../../src/showdown/index'
import { fixtureDex } from '../fixtures/dex'

const at = { line: 3, block: 1, text: 'irrelevant' }

const cases: readonly (readonly [ParseProblem, string])[] = [
  [
    { ...at, kind: 'unknown-species', id: speciesId('missingno') },
    'No species "missingno" in the dataset',
  ],
  [
    { ...at, kind: 'unknown-move', id: moveId('hyper-beam') },
    'No move "hyper-beam" in the dataset',
  ],
  [
    { ...at, kind: 'unknown-item', id: itemId('bright-powder') },
    'No item "bright-powder" in the dataset',
  ],
  [{ ...at, kind: 'unknown-ability', id: abilityId('moody') }, 'No ability "moody" in the dataset'],
  [{ ...at, kind: 'unknown-nature', value: 'Grumpy' }, '"Grumpy" is not a nature'],
  [{ ...at, kind: 'unknown-tera-type', value: 'Shadow' }, '"Shadow" is not a Tera type'],
  [{ ...at, kind: 'unknown-stat', value: 'Luck' }, '"Luck" is not a stat'],
  [{ ...at, kind: 'ev-total-exceeded', total: 600, max: 508 }, '600 EVs spent, 508 allowed'],
  [{ ...at, kind: 'too-many-moves', limit: 4 }, 'More than 4 moves. The rest were dropped'],
  [
    { ...at, kind: 'unsupported-field', field: 'Happiness' },
    'Happiness is not modelled and was dropped',
  ],
  [{ ...at, kind: 'malformed-line' }, 'Line not understood'],
]

const kinds: Record<ParseProblem['kind'], true> = {
  'unknown-species': true,
  'unknown-move': true,
  'unknown-item': true,
  'unknown-ability': true,
  'unknown-nature': true,
  'unknown-tera-type': true,
  'unknown-stat': true,
  'ev-total-exceeded': true,
  'too-many-moves': true,
  'unsupported-field': true,
  'malformed-line': true,
}

describe('describeProblem', () => {
  it.each(cases)('describes %o', (problem, text) => {
    expect(describeProblem(problem)).toBe(text)
  })

  it('covers every kind of problem', () => {
    expect(new Set(cases.map(([problem]) => problem.kind))).toEqual(new Set(Object.keys(kinds)))
  })

  it.each(cases)('writes no exclamation mark for %o', (problem) => {
    expect(describeProblem(problem)).not.toContain('!')
  })
})

describe('a broken paste', () => {
  const paste = [
    'Missingno @ Bright Powder',
    'Ability: Moody',
    '',
    'Garchomp @ Bright Powder',
    'Ability: Moody',
    'EVs: 252 Atk / 252 Spe / 252 HP',
    'Grumpy Nature',
    '- Earthquake',
    '- Hyper Beam',
  ].join('\n')

  const result = parse({ paste, dex: fixtureDex })
  const described = problemsOf(result).map(describeProblem)

  it('keeps the set whose species resolved', () => {
    expect(setsOf(result).map((set) => set.species)).toEqual(['garchomp'])
  })

  it('names the species it could not find', () => {
    expect(described).toContain('No species "missingno" in the dataset')
  })

  it('names the item it could not find', () => {
    expect(described).toContain('No item "bright-powder" in the dataset')
  })

  it('names the move it could not find', () => {
    expect(described).toContain('No move "hyper-beam" in the dataset')
  })

  it('names the nature it could not read', () => {
    expect(described).toContain('"Grumpy" is not a nature')
  })

  it('reports the EVs over the total', () => {
    expect(described).toContain('756 EVs spent, 508 allowed')
  })

  it('locates each problem on its own line', () => {
    expect(problemsOf(result).find((problem) => problem.kind === 'unknown-move')?.line).toBe(9)
  })

  it('locates each problem in its own block', () => {
    expect(problemsOf(result).find((problem) => problem.kind === 'unknown-move')?.block).toBe(2)
  })

  it('does not throw on text that is not a paste at all', () => {
    expect(() => parse({ paste: '\u0000\n@@@\n- \n: :', dex: fixtureDex })).not.toThrow()
  })

  it('gives no sets for an empty paste', () => {
    expect(setsOf(parse({ paste: '', dex: fixtureDex }))).toEqual([])
  })
})
