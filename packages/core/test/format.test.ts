import { describe, expect, it } from 'vitest'
import type { Format, FormatSource } from '../src/index'
import {
  allowsTera,
  CLAUSES,
  CLAUSE_DESCRIPTION,
  CLAUSE_LABEL,
  gen9Ou,
  hasClause,
  levelFor,
  MalformedDate,
  regulationH,
  sourceFreshness,
} from '../src/index'

function caught(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error('expected the call to throw')
}

const source = (verifiedOn: string, staleAfterDays: number | null = 30): FormatSource => ({
  authority: 'custom',
  citation: 'test',
  verifiedOn,
  staleAfterDays,
})

const capped = (max: number): Format => ({ ...gen9Ou, level: { kind: 'capped', max } })
const fixed = (level: number): Format => ({ ...regulationH, level: { kind: 'fixed', level } })

describe('sourceFreshness on a malformed date', () => {
  const malformed = [
    '2026-8-16',
    '16/08/2026',
    '2026-08-16T00:00:00Z',
    ' 2026-08-16',
    '',
    '2026-00-10',
    '2026-13-01',
    '2026-04-31',
    '2026-02-29',
    '2100-02-29',
    '2026-01-00',
  ]

  it.each(malformed)('throws MalformedDate for today %j', (today) => {
    expect(caught(() => sourceFreshness(source('2026-08-16'), today))).toBeInstanceOf(MalformedDate)
  })

  it.each(malformed)('throws MalformedDate for verifiedOn %j', (verifiedOn) => {
    expect(caught(() => sourceFreshness(source(verifiedOn), '2026-08-16'))).toBeInstanceOf(
      MalformedDate,
    )
  })

  it('quotes the value it rejected', () => {
    expect(() => sourceFreshness(source('2026-08-16'), '2026-02-30')).toThrow(
      'Expected an ISO date of the form YYYY-MM-DD, got "2026-02-30"',
    )
  })

  it('records the value it rejected', () => {
    expect(MalformedDate.of('yesterday').value).toBe('yesterday')
  })

  it('names itself', () => {
    expect(MalformedDate.of('yesterday').name).toBe('MalformedDate')
  })

  it('does not read a date for a source that never goes stale', () => {
    expect(sourceFreshness(source('not a date', null), 'nor this')).toEqual({ kind: 'unchanging' })
  })
})

describe('sourceFreshness across calendar edges', () => {
  it('accepts a leap day in a leap year', () => {
    expect(sourceFreshness(source('2024-02-28'), '2024-03-01')).toEqual({
      kind: 'fresh',
      ageInDays: 2,
      staleAfterDays: 30,
    })
  })

  it('accepts the leap day of a year divisible by 400', () => {
    expect(sourceFreshness(source('2000-02-29'), '2000-03-01').kind).toBe('fresh')
  })

  it('counts across a year boundary', () => {
    expect(sourceFreshness(source('2025-12-31', 400), '2027-01-01')).toEqual({
      kind: 'fresh',
      ageInDays: 366,
      staleAfterDays: 400,
    })
  })

  it('counts a leap year as 366 days', () => {
    expect(sourceFreshness(source('2024-01-01', 400), '2025-01-01')).toEqual({
      kind: 'fresh',
      ageInDays: 366,
      staleAfterDays: 400,
    })
  })

  it('reports a negative age when today is before the verification', () => {
    expect(sourceFreshness(source('2026-08-16'), '2026-08-10')).toEqual({
      kind: 'fresh',
      ageInDays: -6,
      staleAfterDays: 30,
    })
  })

  it('calls a reading of age zero fresh when it goes stale after zero days', () => {
    expect(sourceFreshness(source('2026-08-16', 0), '2026-08-16').kind).toBe('fresh')
  })
})

describe('levelFor', () => {
  it('forces a fixed level whatever was asked for', () => {
    expect(levelFor(fixed(50), 100)).toBe(50)
  })

  it('raises to a fixed level too', () => {
    expect(levelFor(fixed(50), 5)).toBe(50)
  })

  it('caps a level above the maximum', () => {
    expect(levelFor(capped(100), 120)).toBe(100)
  })

  it('keeps a level under the cap', () => {
    expect(levelFor(capped(100), 72)).toBe(72)
  })

  it('keeps a level at the cap', () => {
    expect(levelFor(capped(100), 100)).toBe(100)
  })
})

describe('hasClause', () => {
  it('holds for a clause the format declares', () => {
    expect(hasClause(regulationH, 'species')).toBe(true)
  })

  it('does not hold for a clause the format leaves out', () => {
    expect(hasClause({ ...regulationH, clauses: [] }, 'species')).toBe(false)
  })
})

describe('allowsTera', () => {
  it('holds when the gimmick is Terastal', () => {
    expect(allowsTera({ ...regulationH, gimmick: 'terastal' })).toBe(true)
  })

  it.each(['dynamax', 'mega', 'z-move', 'none'] as const)('does not hold under %s', (gimmick) => {
    expect(allowsTera({ ...regulationH, gimmick })).toBe(false)
  })
})

describe('the clause copy', () => {
  it.each(CLAUSES)('labels %s', (clause) => {
    expect(CLAUSE_LABEL[clause]).toMatch(/ Clause$/)
  })

  it.each(CLAUSES)('describes %s in one sentence', (clause) => {
    expect(CLAUSE_DESCRIPTION[clause]).toMatch(/^[A-Z][^!]*\.$/)
  })
})
