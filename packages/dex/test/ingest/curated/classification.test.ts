import { describe, expect, it } from 'vitest'
import type { SpeciesClassification } from '@spc/core'
import { BUNDLED_DATASET } from '../../../src/bundled'
import {
  PARADOX_SPECIES,
  RESTRICTED_SPECIES,
  SUB_LEGENDARY_SPECIES,
  ULTRA_BEAST_SPECIES,
} from '../../../src/ingest/curated/classification'

const TABLES = [
  ['PARADOX_SPECIES', PARADOX_SPECIES, 'paradox'],
  ['ULTRA_BEAST_SPECIES', ULTRA_BEAST_SPECIES, 'ultra-beast'],
  ['RESTRICTED_SPECIES', RESTRICTED_SPECIES, 'restricted'],
  ['SUB_LEGENDARY_SPECIES', SUB_LEGENDARY_SPECIES, 'sub-legendary'],
] as const satisfies readonly (readonly [string, ReadonlySet<string>, SpeciesClassification])[]

const isFormOf = (formId: string, speciesName: string): boolean =>
  formId === speciesName || formId.startsWith(`${speciesName}-`)

describe.each(TABLES)('%s', (_, names, classification) => {
  it(`gives at least one form of every species it names the ${classification} class`, () => {
    const inert = [...names].filter(
      (name) =>
        !BUNDLED_DATASET.species.some(
          (form) => isFormOf(form.id, name) && form.classification === classification,
        ),
    )
    expect(inert).toEqual([])
  })

  it('shares no species with another classification table', () => {
    const others = TABLES.filter(([, table]) => table !== names).flatMap(([, table]) => [...table])
    expect([...names].filter((name) => others.includes(name))).toEqual([])
  })
})
