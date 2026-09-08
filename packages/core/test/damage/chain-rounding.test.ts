/**
 * The chain rounds a tie the other way from `pokeRound`, and the two used to
 * be the same function. `@smogon/calc` is the oracle here as it is for a whole
 * calculation: `chainMods` is the published Generation 9 chain, and this file
 * asserts against it rather than against a formula written twice.
 */

import { describe, expect, it } from 'vitest'
import { chainMods } from '@smogon/calc/dist/mechanics/util'
import { chainModifiers } from '../../src/damage/index'

/**
 * Every modifier constant the tables in `src/damage` can produce. Written out
 * rather than scraped, so a new constant arrives here as a deliberate edit.
 */
const MODIFIERS: readonly number[] = [
  2048, // a half: a screen in singles, Multiscale, Solar Beam out of the sun
  2732, // two thirds: a screen in doubles
  3072, // three quarters: Friend Guard, Solid Rock, an aura under Aura Break
  4096, // one
  4505, // 1.1x: Muscle Band, Wise Glasses
  4506, // 1.1x the other way: Punching Glove
  4915, // 1.2x: Expert Belt, a type-boosting item, Stellar STAB
  5120, // 1.25x: Dry Skin against Fire
  5324, // 1.3x applied to a roll: Life Orb
  5325, // 1.3x on the chain: a Paradox boost, Tough Claws, Analytic
  5461, // 4/3x: Hadron Engine, Orichalcum Pulse, Collision Course
  6144, // 1.5x: STAB, Technician, Helping Hand, a pinch ability
  8192, // 2x: Adaptability STAB, Tinted Lens
  9216, // 2.25x: Adaptability STAB after Terastallizing into the same type
]

const UNBOUNDED: readonly [number, number] = [1, Number.MAX_SAFE_INTEGER]

function referenceChain(modifiers: readonly number[]): number {
  return chainMods([...modifiers], UNBOUNDED[0], UNBOUNDED[1])
}

describe('a chained pair', () => {
  it.each(MODIFIERS.flatMap((left) => MODIFIERS.map((right) => [left, right] as const)))(
    'agrees with the reference on %i then %i',
    (left, right) => {
      expect(chainModifiers([left, right])).toBe(referenceChain([left, right]))
    },
  )
})

describe('a screen followed by an Expert Belt', () => {
  it('rounds the tie up', () => {
    expect(chainModifiers([2048, 4915])).toBe(2458)
  })

  it('is what the reference gives', () => {
    expect(chainModifiers([2048, 4915])).toBe(referenceChain([2048, 4915]))
  })
})

describe('a chain of three', () => {
  it('agrees with the reference on a screen, an Expert Belt and Tough Claws', () => {
    expect(chainModifiers([2048, 4915, 5325])).toBe(referenceChain([2048, 4915, 5325]))
  })

  it('agrees with the reference on the longest doubling chain the reference survives', () => {
    const doublings = [8192, 8192, 8192, 8192, 8192, 8192]
    expect(chainModifiers(doublings)).toBe(referenceChain(doublings))
  })

  /**
   * One more doubling and `(a * b) >> 12` wraps: the reference returns its
   * lower bound. Nothing in `src/damage` chains six doubling modifiers, but
   * this is why the chain here divides rather than shifts.
   */
  it('keeps going where the reference wraps', () => {
    const doublings = new Array<number>(7).fill(8192)
    expect(chainModifiers(doublings)).toBe(524288)
  })
})
