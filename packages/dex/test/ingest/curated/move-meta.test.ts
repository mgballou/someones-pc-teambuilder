import { describe, expect, it } from 'vitest'
import type { Move } from '@spc/core'
import { BUNDLED_DATASET } from '../../../src/bundled'
import { CURATED_MOVE_META, SELF_STAT_CHANGE_MOVES } from '../../../src/ingest/curated/move-meta'

const moves = new Map<string, Move>(BUNDLED_DATASET.moves.map((m) => [m.id, m]))

describe('CURATED_MOVE_META', () => {
  it('names only moves the dataset holds', () => {
    expect(Object.keys(CURATED_MOVE_META).filter((id) => !moves.has(id))).toEqual([])
  })

  it('agrees with the dataset on every field it fills', () => {
    const wrong = Object.entries(CURATED_MOVE_META).filter(([id, meta]) => {
      const move = moves.get(id)
      if (move === undefined) return true
      return (
        (meta.drain !== undefined && move.drain !== meta.drain) ||
        (meta.recoil !== undefined && move.recoil !== meta.recoil) ||
        (meta.critRatio !== undefined && move.critRatio !== meta.critRatio) ||
        (meta.multiHit !== undefined &&
          (move.multiHit?.min !== meta.multiHit.min || move.multiHit.max !== meta.multiHit.max))
      )
    })
    expect(wrong.map(([id]) => id)).toEqual([])
  })
})

describe('SELF_STAT_CHANGE_MOVES', () => {
  it('names only moves the dataset holds', () => {
    expect([...SELF_STAT_CHANGE_MOVES].filter((id) => !moves.has(id))).toEqual([])
  })

  it('points every stat change of the moves it names at the user', () => {
    const wrong = [...SELF_STAT_CHANGE_MOVES].filter((id) =>
      moves.get(id)?.statChanges.some((change) => change.target !== 'user'),
    )
    expect(wrong).toEqual([])
  })
})
