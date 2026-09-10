/**
 * What number of hits the calculator picks, and what it says about picking it.
 *
 * The damage at a given count is checked against the reference in
 * `reference.test.ts`. This file is about the choice, which no reference can
 * settle: it is a declaration the tool makes and has to keep.
 */

import { describe, expect, it } from 'vitest'
import type { DamageResult } from '../../src/index'
import {
  calculate,
  DEFAULT_FIELD,
  hitCount,
  hitOdds,
  moveId,
  newAttacker,
  newDefender,
  oddsOf,
} from '../../src/index'
import { fixtureDex } from '../fixtures/dex'
import { buildSet } from './helpers'

const TWO_TO_FIVE = { min: 2, max: 5 }
const ONE_TO_TEN = { min: 1, max: 10 }
const FIXED_THREE = { min: 3, max: 3 }

type Options = { readonly ability?: string; readonly hits?: number; readonly move?: string }

function result({
  ability = 'shell-armor',
  hits,
  move = 'icicle-spear',
}: Options = {}): DamageResult {
  return calculate({
    attacker: newAttacker({
      set: buildSet({ species: 'cloyster', ability, evs: { atk: 252 } }),
      ...(hits === undefined ? {} : { hits }),
    }),
    defender: newDefender({ set: buildSet({ species: 'blissey', evs: { hp: 252, def: 252 } }) }),
    move: moveId(move),
    field: DEFAULT_FIELD,
    dex: fixtureDex,
  })
}

function noteAbout(move: string, damage: DamageResult): string {
  return damage.notes.find((note) => note.startsWith(move)) ?? ''
}

describe('the odds a two-to-five-hit move lands each count', () => {
  it('makes two and three the common ones', () => {
    expect(oddsOf(TWO_TO_FIVE, 3)).toBe(35)
  })

  it('makes four and five the rare ones', () => {
    expect(oddsOf(TWO_TO_FIVE, 5)).toBe(15)
  })

  it('adds up to a hundred', () => {
    expect((hitOdds(TWO_TO_FIVE) ?? []).reduce((total, odds) => total + odds.percent, 0)).toBe(100)
  })

  it('is not modelled for a move with a different range', () => {
    expect(hitOdds(ONE_TO_TEN)).toBeNull()
  })

  it('is not modelled for a move that always lands the same number', () => {
    expect(hitOdds(FIXED_THREE)).toBeNull()
  })
})

describe('the count the calculator picks', () => {
  it('is one for a move that hits once', () => {
    expect(hitCount({ multiHit: null, everyHitLands: false, requested: null })).toBe(1)
  })

  it('is three for a two-to-five move, not five', () => {
    expect(hitCount({ multiHit: TWO_TO_FIVE, everyHitLands: false, requested: null })).toBe(3)
  })

  it('is the maximum when every hit lands', () => {
    expect(hitCount({ multiHit: TWO_TO_FIVE, everyHitLands: true, requested: null })).toBe(5)
  })

  it('is the maximum where the distribution is not modelled', () => {
    expect(hitCount({ multiHit: ONE_TO_TEN, everyHitLands: false, requested: null })).toBe(10)
  })

  it('takes what the caller asked for', () => {
    expect(hitCount({ multiHit: TWO_TO_FIVE, everyHitLands: false, requested: 4 })).toBe(4)
  })

  it('clamps a request above the maximum', () => {
    expect(hitCount({ multiHit: TWO_TO_FIVE, everyHitLands: false, requested: 9 })).toBe(5)
  })

  it('clamps a request below the minimum', () => {
    expect(hitCount({ multiHit: TWO_TO_FIVE, everyHitLands: false, requested: 1 })).toBe(2)
  })
})

describe('a calculated Icicle Spear', () => {
  it('reports three hits', () => {
    expect(result().hits).toBe(3)
  })

  it('reports the damage of three hits', () => {
    expect(result().max).toBe(126)
  })

  it('names the count it used', () => {
    expect(noteAbout('Icicle Spear', result())).toContain('calculated at 3 hits')
  })

  it('names the count as the likeliest rather than the best', () => {
    expect(noteAbout('Icicle Spear', result())).toContain('the likeliest of 2 to 5')
  })

  it('gives the whole distribution in the note', () => {
    expect(noteAbout('Icicle Spear', result())).toContain(
      'The odds are 2 hits 35%, 3 hits 35%, 4 hits 15%, 5 hits 15%.',
    )
  })
})

describe('an Icicle Spear from a Skill Link holder', () => {
  it('reports five hits', () => {
    expect(result({ ability: 'skill-link' }).hits).toBe(5)
  })

  it('says why it took all five', () => {
    expect(noteAbout('Icicle Spear', result({ ability: 'skill-link' }))).toContain(
      "the attacker's ability lands every one",
    )
  })

  it('does not report Skill Link as outside the damage model', () => {
    expect(result({ ability: 'skill-link' }).notes.join(' ')).not.toContain('Skill Link is outside')
  })
})

describe('an Icicle Spear at a count the caller chose', () => {
  it('reports that count', () => {
    expect(result({ hits: 5 }).hits).toBe(5)
  })

  it('says how often that count actually lands', () => {
    expect(noteAbout('Icicle Spear', result({ hits: 5 }))).toContain('which land 15% of the time')
  })
})

describe('Population Bomb, whose distribution is not modelled', () => {
  it('is calculated at its maximum', () => {
    expect(result({ move: 'population-bomb' }).hits).toBe(10)
  })

  it('says the distribution is outside the model rather than implying one', () => {
    expect(noteAbout('Population Bomb', result({ move: 'population-bomb' }))).toContain(
      'How often it lands fewer is outside the damage model',
    )
  })
})

describe('a move that hits once', () => {
  it('says nothing about a hit count', () => {
    expect(noteAbout('Icicle Crash', result({ move: 'icicle-crash' }))).toBe('')
  })
})

describe('Triple Axel, which always lands three', () => {
  it('says nothing about how many hits it took', () => {
    expect(result({ move: 'triple-axel' }).notes.join(' ')).not.toContain('calculated at')
  })

  it('still reports three hits', () => {
    expect(result({ move: 'triple-axel' }).hits).toBe(3)
  })
})
