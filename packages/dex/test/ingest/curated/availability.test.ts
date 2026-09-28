import { describe, expect, it } from 'vitest'
import type { Species } from '@spc/core'
import { BUNDLED_DATASET } from '../../../src/bundled'
import { AVAILABLE_IN_GEN_9, UNAVAILABLE_IN_GEN_9 } from '../../../src/ingest/curated/availability'

const forms = new Map<string, Species>(BUNDLED_DATASET.species.map((s) => [s.id, s]))
const inGen9 = (id: string): boolean | undefined => forms.get(id)?.availableIn.includes(9)

describe('AVAILABLE_IN_GEN_9', () => {
  it('names only forms the dataset holds', () => {
    expect([...AVAILABLE_IN_GEN_9].filter((id) => !forms.has(id))).toEqual([])
  })

  it('marks every form it names as in Scarlet and Violet', () => {
    expect([...AVAILABLE_IN_GEN_9].filter((id) => inGen9(id) !== true)).toEqual([])
  })
})

describe('UNAVAILABLE_IN_GEN_9', () => {
  it('names only forms the dataset holds', () => {
    expect([...UNAVAILABLE_IN_GEN_9].filter((id) => !forms.has(id))).toEqual([])
  })

  it('marks every form it names as absent from Scarlet and Violet', () => {
    expect([...UNAVAILABLE_IN_GEN_9].filter((id) => inGen9(id) !== false)).toEqual([])
  })

  it('shares no form with the available list', () => {
    expect([...UNAVAILABLE_IN_GEN_9].filter((id) => AVAILABLE_IN_GEN_9.has(id))).toEqual([])
  })
})
