import { describe, expect, it } from 'vitest'
import type { Species } from '@spc/core'
import { BUNDLED_DATASET } from '../../../src/bundled'
import { NON_EVOLVING_FORMS, NO_TERASTAL_FORMS } from '../../../src/ingest/curated/species-quirks'

const forms = new Map<string, Species>(BUNDLED_DATASET.species.map((s) => [s.id, s]))

describe('NON_EVOLVING_FORMS', () => {
  it('names only forms the dataset holds', () => {
    expect([...NON_EVOLVING_FORMS].filter((id) => !forms.has(id))).toEqual([])
  })

  it('leaves every form it names unable to evolve', () => {
    expect([...NON_EVOLVING_FORMS].filter((id) => forms.get(id)?.canEvolve !== false)).toEqual([])
  })
})

describe('NO_TERASTAL_FORMS', () => {
  it('names only forms the dataset holds', () => {
    expect([...NO_TERASTAL_FORMS].filter((id) => !forms.has(id))).toEqual([])
  })

  it('leaves every form it names unable to Terastallize', () => {
    const wrong = [...NO_TERASTAL_FORMS].filter(
      (id) => forms.get(id)?.gimmicks.canTerastallize !== false,
    )
    expect(wrong).toEqual([])
  })
})
