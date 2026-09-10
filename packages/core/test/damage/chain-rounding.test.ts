/**
 * The chain rounds a tie the other way from `pokeRound`, and the two used to
 * be the same function. `@smogon/calc` is the oracle here as it is for a whole
 * calculation: `chainMods` is the published Generation 9 chain, and this file
 * asserts against it rather than against a formula written twice.
 */

import { describe, expect, it } from 'vitest'
import { chainMods } from '@smogon/calc/dist/mechanics/util'
import { chainModifiers, pokeRound } from '../../src/damage/index'

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

/**
 * Every chain the four call sites can assemble, and not a sample of them.
 *
 * `chainModifiers` is called in exactly four places, each with a fixed list of
 * slots, and each slot holds either nothing or one of a closed set of constants
 * the registries in `src/damage` can return. That makes the whole reachable
 * space finite and small — 1,018 chains — so it is enumerated here rather than
 * sampled, which is what the earlier 1,904-case hunt could not do.
 *
 * The tie is not rare. Rounding it down instead of up changes the chained
 * modifier on 527 of those 1,018, and the shortest chains it changes are two
 * modifiers deep and entirely ordinary: a type plate under Grassy Terrain, an
 * Expert Belt behind a screen or Multiscale, Hadron Engine with a Choice item.
 *
 * These lists mirror the four call sites. A new modifier constant has to be
 * added here as a deliberate edit, the same rule `MODIFIERS` above carries.
 */
const NOTHING = null

const CALL_SITES: Readonly<Record<string, readonly (readonly (number | null)[])[]>> = {
  /** The base-power chain, `calculate.ts`. */
  basePower: [
    [NOTHING, 6144, 8192, 5461], // the conditional-power table
    [NOTHING, 6144], // Helping Hand
    [NOTHING, 6144, 5325], // Technician, Sheer Force
    [NOTHING, 5120], // Dry Skin against Fire
    [NOTHING, 4915, 4505], // a type plate, Muscle Band or Wise Glasses
    [NOTHING, 5325, 2048], // terrain, or Misty Terrain against Dragon
    [NOTHING, 2048], // Earthquake and friends on Grassy Terrain
  ],
  /** The final chain. */
  final: [
    [NOTHING, 2048, 2732], // a screen, in singles or doubles
    [NOTHING, 3072, 2048], // Filter and its kin, Multiscale and its kin
    [NOTHING, 3072], // Friend Guard
    [NOTHING, 5324, 4915], // Life Orb, Expert Belt
    [NOTHING, 8192], // Tinted Lens
  ],
  /** The attacking stat. */
  attack: [
    [NOTHING, 8192, 6144, 5461, 5325], // Huge Power, a pinch ability, Hadron Engine, a Paradox
    [NOTHING, 3072, 2048], // Tablets or Vessel of Ruin, Thick Fat
    [NOTHING, 6144], // a Choice item
  ],
  /** The defending stat. */
  defense: [
    [NOTHING, 5325], // a Paradox ability
    [NOTHING, 3072], // Sword or Beads of Ruin
    [NOTHING, 6144], // Assault Vest, Eviolite
    [NOTHING, 6144], // sand on a Rock type, snow on an Ice type
  ],
}

function everyChain(slots: readonly (readonly (number | null)[])[]): readonly number[][] {
  return slots.reduce<number[][]>(
    (chains, slot) =>
      chains.flatMap((chain) =>
        slot.map((modifier) => (modifier === null ? chain : [...chain, modifier])),
      ),
    [[]],
  )
}

describe('every chain the four call sites can assemble', () => {
  const chains = Object.values(CALL_SITES).flatMap(everyChain)

  it('searches the whole space and not a sample of it', () => {
    expect(chains).toHaveLength(1018)
  })

  it('agrees with the reference on all of them', () => {
    const wrong = chains.filter((chain) => chainModifiers(chain) !== referenceChain(chain))
    expect(wrong).toEqual([])
  })

  it('is a space the tie reaches on half of', () => {
    const tied = chains.filter((chain) => chainModifiers(chain) !== tiesDown(chain))
    expect(tied).toHaveLength(527)
  })
})

/** What `chainModifiers` did before: `pokeRound`, which sends a tie down. */
function tiesDown(modifiers: readonly number[]): number {
  return modifiers.reduce((chained, modifier) => pokeRound((chained * modifier) / 4096), 4096)
}
