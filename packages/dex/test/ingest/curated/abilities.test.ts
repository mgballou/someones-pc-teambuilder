import { describe, expect, it } from 'vitest'
import type { Ability } from '@spc/core'
import { BUNDLED_DATASET } from '../../../src/bundled'
import { UNSUPPRESSABLE_ABILITIES } from '../../../src/ingest/curated/abilities'

const abilities = new Map<string, Ability>(BUNDLED_DATASET.abilities.map((a) => [a.id, a]))

describe('UNSUPPRESSABLE_ABILITIES', () => {
  it('names only abilities the dataset holds', () => {
    expect([...UNSUPPRESSABLE_ABILITIES].filter((id) => !abilities.has(id))).toEqual([])
  })

  it('reaches the dataset as the only unsuppressable abilities', () => {
    const unsuppressable = BUNDLED_DATASET.abilities.filter((a) => !a.suppressable).map((a) => a.id)
    expect(unsuppressable.sort()).toEqual([...UNSUPPRESSABLE_ABILITIES].sort())
  })
})
