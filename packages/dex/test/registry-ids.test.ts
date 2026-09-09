/**
 * Every move id a core registry names has to be a move that exists.
 *
 * A registry entry keyed on an id the dataset does not hold is silently inert:
 * it never fires, nothing throws, and the table reads as if it covered the
 * case. The hostile review found one of those in a banlist — `'palafin'`,
 * against a dataset holding `palafin-zero` and `palafin-hero` — and the
 * conditional-power table is the same shape and the same risk, so it is
 * checked against the committed dataset here rather than trusted.
 *
 * This lives in `@spc/dex` because `@spc/core` may not read the dataset: it
 * declares the `Dex` interface and never depends on an implementation of it.
 */

import { describe, expect, it } from 'vitest'
import type { Format } from '@spc/core'
import {
  abilityId,
  ABILITY_REGISTRY,
  CONDITIONAL_POWER,
  MOVE_OVERRIDES,
  MOVE_TYPE_READINGS,
  moveId,
  SHIPPED_FORMATS,
} from '@spc/core'
import { BUNDLED_DATASET } from '../src/bundled'

const MOVES = new Set(BUNDLED_DATASET.moves.map((move) => move.id))
const ABILITIES = new Set(BUNDLED_DATASET.abilities.map((ability) => ability.id))

function absent(ids: readonly string[]): readonly string[] {
  return ids.filter((id) => !MOVES.has(moveId(id)))
}

describe('the conditional-power table', () => {
  it('names no move the dataset does not hold', () => {
    expect(absent(Object.keys(CONDITIONAL_POWER))).toEqual([])
  })

  it('is not empty, so an empty pass cannot look like a passing one', () => {
    expect(Object.keys(CONDITIONAL_POWER).length).toBeGreaterThan(20)
  })
})

describe('the move override table', () => {
  it('names no move the dataset does not hold', () => {
    expect(absent(Object.keys(MOVE_OVERRIDES))).toEqual([])
  })
})

describe('the type reading table', () => {
  it('names no move the dataset does not hold', () => {
    expect(absent(Object.keys(MOVE_TYPE_READINGS))).toEqual([])
  })
})

describe('a move whose power the dataset says is constant', () => {
  /**
   * The printed power of a move in the conditional table is still the number
   * every rule starts from, so a move that arrived with no printed power at all
   * would be read as zero and multiplied by zero. `variablePower` is meant to
   * catch those, and this is the check that it did.
   */
  it('has a printed power for every conditional entry that scales one', () => {
    const zeroed = Object.keys(CONDITIONAL_POWER).filter((id) => {
      const move = BUNDLED_DATASET.moves.find((record) => record.id === moveId(id))
      return move !== undefined && move.basePower === 0 && move.variablePower === null
    })

    expect(zeroed).toEqual([])
  })
})

describe('the ability registry', () => {
  it('names no ability the dataset does not hold', () => {
    expect(Object.keys(ABILITY_REGISTRY).filter((id) => !ABILITIES.has(abilityId(id)))).toEqual([])
  })

  it('is not empty, so an empty pass cannot look like a passing one', () => {
    expect(Object.keys(ABILITY_REGISTRY).length).toBeGreaterThan(20)
  })
})

/**
 * The fault the hostile read named, checked rather than fixed once.
 *
 * `'palafin'` sat in the OU ban list against a dataset holding `palafin-zero`
 * and `palafin-hero`, and banned nothing. There was no lint, no test and no
 * startup check that would ever have surfaced it, and a ban list is exactly the
 * kind of hand-transcribed table where a wrong id looks like a right one.
 */
describe('every id a shipped format names', () => {
  const SPECIES = new Set(BUNDLED_DATASET.species.map((species) => species.id))
  const ITEMS = new Set(BUNDLED_DATASET.items.map((item) => item.id))

  const dangling = (pick: (format: Format) => readonly string[]): readonly string[] =>
    SHIPPED_FORMATS.flatMap((format) => pick(format).map((id) => `${format.shortName}: ${id}`))

  it('names a species the dataset holds', () => {
    expect(
      dangling((format) =>
        [...format.legality.bannedSpecies, ...format.legality.restrictedSpecies].filter(
          (id) => !SPECIES.has(id),
        ),
      ),
    ).toEqual([])
  })

  it('names a move the dataset holds', () => {
    expect(
      dangling((format) => format.legality.bannedMoves.filter((id) => !MOVES.has(id))),
    ).toEqual([])
  })

  it('names an ability the dataset holds', () => {
    expect(
      dangling((format) => format.legality.bannedAbilities.filter((id) => !ABILITIES.has(id))),
    ).toEqual([])
  })

  it('names an item the dataset holds', () => {
    expect(
      dangling((format) => format.legality.bannedItems.filter((id) => !ITEMS.has(id))),
    ).toEqual([])
  })

  it('is checking a ban list with something in it', () => {
    const named = SHIPPED_FORMATS.flatMap((format) => format.legality.bannedSpecies)

    expect(named.length).toBeGreaterThan(50)
  })
})
