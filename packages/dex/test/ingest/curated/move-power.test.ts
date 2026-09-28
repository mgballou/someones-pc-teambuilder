import { describe, expect, it } from 'vitest'
import type { Move } from '@spc/core'
import { BUNDLED_DATASET } from '../../../src/bundled'
import { CURATED_VARIABLE_POWER } from '../../../src/ingest/curated/move-power'

const moves = new Map<string, Move>(BUNDLED_DATASET.moves.map((m) => [m.id, m]))

describe('CURATED_VARIABLE_POWER', () => {
  it('names only moves the dataset holds', () => {
    expect(Object.keys(CURATED_VARIABLE_POWER).filter((id) => !moves.has(id))).toEqual([])
  })

  it.each(Object.entries(CURATED_VARIABLE_POWER))('writes the rule for %s', (id, power) => {
    expect(moves.get(id)?.variablePower).toEqual(power)
  })
})
