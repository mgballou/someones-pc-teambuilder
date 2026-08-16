import { describe, expect, it } from 'vitest'
import type { Move, Species } from '../../src/index.js'
import { calculate, DEFAULT_FIELD, newAttacker, newDefender } from '../../src/damage/index.js'
import { fixtureDex } from '../fixtures/dex.js'
import { buildSet } from './helpers.js'

const SPECIES: readonly Species[] = fixtureDex.allSpecies()
const DAMAGING: readonly Move[] = fixtureDex
  .allMoves()
  .filter((move) => move.category !== 'status' && move.basePower > 0)

type Trial = {
  readonly attacker: Species
  readonly defender: Species
  readonly move: Move
}

const TRIALS: readonly Trial[] = SPECIES.flatMap((attacker) =>
  SPECIES.flatMap((defender) => DAMAGING.map((move) => ({ attacker, defender, move }))),
)

function resultFor({ attacker, defender, move }: Trial) {
  return calculate({
    attacker: newAttacker({ set: buildSet({ species: attacker.id, evs: { atk: 252, spa: 252 } }) }),
    defender: newDefender({ set: buildSet({ species: defender.id, evs: { hp: 252 } }) }),
    move: move.id,
    field: DEFAULT_FIELD,
    dex: fixtureDex,
  })
}

describe('every matchup in the fixture', () => {
  it('covers more than a thousand combinations', () => {
    expect(TRIALS.length).toBeGreaterThan(1000)
  })

  it('always returns sixteen rolls', () => {
    const wrong = TRIALS.filter((trial) => resultFor(trial).rolls.length !== 16)
    expect(wrong).toEqual([])
  })

  it('never lets the highest roll fall below the lowest', () => {
    const wrong = TRIALS.filter((trial) => {
      const result = resultFor(trial)
      return result.max < result.min
    })
    expect(wrong).toEqual([])
  })

  it('never returns rolls out of ascending order', () => {
    const wrong = TRIALS.filter((trial) =>
      resultFor(trial).rolls.some((roll, index, all) => index > 0 && roll < (all[index - 1] ?? 0)),
    )
    expect(wrong).toEqual([])
  })

  it('deals at least one damage unless the hit is an immunity', () => {
    const wrong = TRIALS.filter((trial) => {
      const result = resultFor(trial)
      return result.immune ? result.max !== 0 : result.min < 1
    })
    expect(wrong).toEqual([])
  })

  it('reports zero effectiveness exactly when it reports an immunity', () => {
    const wrong = TRIALS.filter((trial) => {
      const result = resultFor(trial)
      return result.immune !== (result.effectiveness === 0)
    })
    expect(wrong).toEqual([])
  })

  it('is deterministic', () => {
    const wrong = TRIALS.filter((trial) => {
      const first = resultFor(trial)
      const second = resultFor(trial)
      return JSON.stringify(first) !== JSON.stringify(second)
    })
    expect(wrong).toEqual([])
  })
})

describe('spread damage', () => {
  const spreadMoves = DAMAGING.filter(
    (move) => move.target === 'all-adjacent' || move.target === 'all-adjacent-foes',
  )

  it('is never more than single-target damage', () => {
    const wrong = SPECIES.flatMap((defender) =>
      spreadMoves.map((move) => {
        const attacker = buildSet({ species: 'garchomp', evs: { atk: 252, spa: 252 } })
        const target = buildSet({ species: defender.id, evs: { hp: 252 } })
        const common = { move: move.id, field: DEFAULT_FIELD, dex: fixtureDex }
        const single = calculate({
          ...common,
          attacker: newAttacker({ set: attacker, targets: 1 }),
          defender: newDefender({ set: target }),
        })
        const spread = calculate({
          ...common,
          attacker: newAttacker({ set: attacker, targets: 2 }),
          defender: newDefender({ set: target }),
        })
        return spread.max > single.max ? `${defender.id}/${move.id}` : null
      }),
    ).filter((entry) => entry !== null)
    expect(wrong).toEqual([])
  })
})
