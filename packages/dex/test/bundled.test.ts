import { describe, expect, it } from 'vitest'
import { SHIPPED_FORMATS } from '@spc/core'
import { BUNDLED_DATASET } from '../src/bundled'
import { loadDataset } from '../src/disk'

const fromDisk = loadDataset()

describe('BUNDLED_DATASET', () => {
  it.each(['species', 'moves', 'items', 'abilities', 'learnsets'] as const)(
    'holds the same %s as the files on disk',
    (key) => {
      expect(BUNDLED_DATASET[key]).toEqual(fromDisk[key])
    },
  )

  it('carries the formats from @spc/core rather than a copy', () => {
    expect(BUNDLED_DATASET.formats).toBe(SHIPPED_FORMATS)
  })
})
