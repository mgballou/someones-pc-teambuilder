import { describe, expect, it } from 'vitest'
import {
  cloneSet,
  EMPTY_EVS,
  EMPTY_MOVES,
  filledMoves,
  moveCount,
  moveId,
  newSet,
  PERFECT_IVS,
  setId,
  setLabel,
  speciesId,
  withMoveAt,
} from '../src/index'

const blank = newSet({ id: setId('a'), species: speciesId('garchomp') })

const EARTHQUAKE = moveId('earthquake')
const PROTECT = moveId('protect')

describe('newSet', () => {
  it('starts at level 50', () => {
    expect(blank.level).toBe(50)
  })

  it('starts with perfect IVs', () => {
    expect(blank.ivs).toEqual(PERFECT_IVS)
  })

  it('starts with no EVs', () => {
    expect(blank.evs).toEqual(EMPTY_EVS)
  })

  it('starts Hardy', () => {
    expect(blank.nature).toBe('hardy')
  })

  it('starts with four empty slots', () => {
    expect(blank.moves).toEqual(EMPTY_MOVES)
  })

  it('keeps the level it is given', () => {
    expect(newSet({ id: setId('a'), species: speciesId('garchomp'), level: 100 }).level).toBe(100)
  })

  it('survives a trip through JSON', () => {
    expect(JSON.parse(JSON.stringify(blank))).toEqual(blank)
  })
})

describe('the move slots', () => {
  const sparse = withMoveAt(withMoveAt(blank, 1, EARTHQUAKE), 3, PROTECT)

  it('fills the slot it names', () => {
    expect(sparse.moves).toEqual([null, EARTHQUAKE, null, PROTECT])
  })

  it('leaves the original set alone', () => {
    expect(blank.moves).toEqual(EMPTY_MOVES)
  })

  it('lists the filled moves in slot order', () => {
    expect(filledMoves(sparse)).toEqual([EARTHQUAKE, PROTECT])
  })

  it('counts the filled moves', () => {
    expect(moveCount(sparse)).toBe(2)
  })

  it('counts zero for an empty set', () => {
    expect(moveCount(blank)).toBe(0)
  })

  it('clears a slot with null', () => {
    expect(withMoveAt(sparse, 1, null).moves).toEqual([null, null, null, PROTECT])
  })
})

describe('cloneSet', () => {
  const copy = cloneSet(withMoveAt(blank, 0, EARTHQUAKE), setId('b'))

  it('takes the new id', () => {
    expect(copy.id).toBe('b')
  })

  it('keeps the moves', () => {
    expect(copy.moves[0]).toBe(EARTHQUAKE)
  })
})

describe('setLabel', () => {
  it('is the species name for a set with no nickname', () => {
    expect(setLabel(blank, 'Garchomp')).toBe('Garchomp')
  })

  it('puts the species after a nickname', () => {
    expect(setLabel({ ...blank, nickname: 'Sharkbait' }, 'Garchomp')).toBe('Sharkbait (Garchomp)')
  })

  it('keeps an empty nickname rather than dropping it', () => {
    expect(setLabel({ ...blank, nickname: '' }, 'Garchomp')).toBe(' (Garchomp)')
  })
})
