import { describe, expect, it } from 'vitest'
import type { Move } from '../src/index'
import {
  isDamaging,
  isOhkoMove,
  isSpreadMove,
  MOVE_TARGETS,
  moveId,
  requireMove,
} from '../src/index'
import { fixtureDex } from './fixtures/dex'

const move = (id: string): Move => requireMove(fixtureDex, moveId(id))

describe('isOhkoMove', () => {
  it('holds for Sheer Cold', () => {
    expect(isOhkoMove(move('sheer-cold'))).toBe(true)
  })

  it('does not hold for a move with an ordinary power rule', () => {
    expect(isOhkoMove(move('earthquake'))).toBe(false)
  })

  it('does not hold for a move whose power is computed some other way', () => {
    expect(isOhkoMove(move('stored-power'))).toBe(false)
  })
})

describe('isDamaging', () => {
  it('holds for a physical move', () => {
    expect(isDamaging(move('earthquake'))).toBe(true)
  })

  it('holds for a special move', () => {
    expect(isDamaging(move('hydro-pump'))).toBe(true)
  })

  it('does not hold for a status move', () => {
    expect(isDamaging(move('swords-dance'))).toBe(false)
  })
})

describe('isSpreadMove', () => {
  const spread = ['all-adjacent-foes', 'all-adjacent', 'all-foes'] as const

  it.each(MOVE_TARGETS)('reads the target %s', (target) => {
    expect(isSpreadMove({ ...move('earthquake'), target })).toBe(
      (spread as readonly string[]).includes(target),
    )
  })

  it('holds for Earthquake, which hits everything adjacent', () => {
    expect(isSpreadMove(move('earthquake'))).toBe(true)
  })

  it('holds for Heat Wave, which hits both foes', () => {
    expect(isSpreadMove(move('heat-wave'))).toBe(true)
  })

  it('does not hold for a single-target move', () => {
    expect(isSpreadMove(move('dragon-claw'))).toBe(false)
  })
})
