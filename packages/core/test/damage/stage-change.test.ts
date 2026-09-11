import { describe, expect, it } from 'vitest'
import type { BoostSpread } from '../../src/index'
import { ZERO_BOOSTS } from '../../src/index'
import type { StageCause, StageChange, StageResponse } from '../../src/damage/index'
import { landStage } from '../../src/damage/index'

const INTIMIDATE: StageChange = { stat: 'atk', stages: -1 }
const CHARGE: StageChange = { stat: 'spa', stages: 1 }
const SELF_DROP: StageChange = { stat: 'def', stages: -1 }

const SIMPLE: StageResponse = { kind: 'multiplies', factor: 2 }
const CONTRARY: StageResponse = { kind: 'multiplies', factor: -1 }
const DEFIANT: StageResponse = { kind: 'answers-foe-drops', stat: 'atk', stages: 2 }
const COMPETITIVE: StageResponse = { kind: 'answers-foe-drops', stat: 'spa', stages: 2 }
const CLEAR_BODY: StageResponse = { kind: 'blocks-foe-drops' }
const INNER_FOCUS: StageResponse = { kind: 'blocks-intimidate' }
const GUARD_DOG: StageResponse = { kind: 'raises-on-intimidate', stages: 1 }

function land(
  change: StageChange,
  cause: StageCause,
  response: StageResponse | null,
  boosts: Partial<BoostSpread> = {},
): BoostSpread {
  return landStage({ boosts: { ...ZERO_BOOSTS, ...boosts }, change, cause, response }).boosts
}

describe('a stage change with no ability answering it', () => {
  it('lands as it was made', () => {
    expect(land(INTIMIDATE, 'intimidate', null).atk).toBe(-1)
  })

  it('stops at the floor', () => {
    expect(land(INTIMIDATE, 'intimidate', null, { atk: -6 }).atk).toBe(-6)
  })

  it('stops at the ceiling', () => {
    expect(land(CHARGE, 'own-move', null, { spa: 6 }).spa).toBe(6)
  })
})

describe('Simple', () => {
  it('doubles Intimidate', () => {
    expect(land(INTIMIDATE, 'intimidate', SIMPLE).atk).toBe(-2)
  })

  it('doubles a change the holder makes itself', () => {
    expect(land(CHARGE, 'own-move', SIMPLE).spa).toBe(2)
  })

  it('says it rewrote the change', () => {
    expect(
      landStage({ boosts: ZERO_BOOSTS, change: CHARGE, cause: 'own-move', response: SIMPLE })
        .rewrite,
    ).toEqual({
      kind: 'multiplied',
      factor: 2,
      stages: 2,
    })
  })
})

describe('Contrary', () => {
  it('turns Intimidate into a raise', () => {
    expect(land(INTIMIDATE, 'intimidate', CONTRARY).atk).toBe(1)
  })

  it('turns a charge into a drop', () => {
    expect(land(CHARGE, 'own-move', CONTRARY).spa).toBe(-1)
  })
})

describe('Clear Body', () => {
  it('blocks Intimidate', () => {
    expect(land(INTIMIDATE, 'intimidate', CLEAR_BODY).atk).toBe(0)
  })

  it('lets the holder lower its own stats', () => {
    expect(land(SELF_DROP, 'own-move', CLEAR_BODY).def).toBe(-1)
  })

  it('lets a raise through', () => {
    expect(land(CHARGE, 'own-move', CLEAR_BODY).spa).toBe(1)
  })

  it('says it blocked the change', () => {
    expect(
      landStage({
        boosts: ZERO_BOOSTS,
        change: INTIMIDATE,
        cause: 'intimidate',
        response: CLEAR_BODY,
      }).rewrite,
    ).toEqual({ kind: 'blocked' })
  })
})

describe('the abilities that block only Intimidate', () => {
  it('block Intimidate', () => {
    expect(land(INTIMIDATE, 'intimidate', INNER_FOCUS).atk).toBe(0)
  })

  it('let the holder lower its own stats', () => {
    expect(land(SELF_DROP, 'own-move', INNER_FOCUS).def).toBe(-1)
  })
})

describe('Guard Dog', () => {
  it('turns Intimidate into a raise', () => {
    expect(land(INTIMIDATE, 'intimidate', GUARD_DOG).atk).toBe(1)
  })

  it('leaves a drop the holder makes itself alone', () => {
    expect(land(SELF_DROP, 'own-move', GUARD_DOG).def).toBe(-1)
  })

  it('does nothing when the stat is already at the floor', () => {
    expect(land(INTIMIDATE, 'intimidate', GUARD_DOG, { atk: -6 }).atk).toBe(-6)
  })
})

describe('Defiant', () => {
  it('answers Intimidate with two stages of Attack', () => {
    expect(land(INTIMIDATE, 'intimidate', DEFIANT).atk).toBe(1)
  })

  it('does not answer a drop the holder makes itself', () => {
    expect(land(SELF_DROP, 'own-move', DEFIANT).atk).toBe(0)
  })

  it('does not answer a drop that could not land', () => {
    expect(land(INTIMIDATE, 'intimidate', DEFIANT, { atk: -6 }).atk).toBe(-6)
  })

  it('stops its answer at the ceiling', () => {
    expect(land(INTIMIDATE, 'intimidate', DEFIANT, { atk: 6 }).atk).toBe(6)
  })

  it('says it answered', () => {
    expect(
      landStage({ boosts: ZERO_BOOSTS, change: INTIMIDATE, cause: 'intimidate', response: DEFIANT })
        .rewrite,
    ).toEqual({ kind: 'answered', stat: 'atk', stages: 2 })
  })
})

describe('Competitive', () => {
  it('answers Intimidate with two stages of Special Attack', () => {
    expect(land(INTIMIDATE, 'intimidate', COMPETITIVE).spa).toBe(2)
  })

  it('leaves the Attack drop in place', () => {
    expect(land(INTIMIDATE, 'intimidate', COMPETITIVE).atk).toBe(-1)
  })

  it('does not answer a drop that could not land', () => {
    expect(land(INTIMIDATE, 'intimidate', COMPETITIVE, { atk: -6 }).spa).toBe(0)
  })
})

describe('every change against every response from every stage', () => {
  const RESPONSES: readonly (StageResponse | null)[] = [
    null,
    SIMPLE,
    CONTRARY,
    DEFIANT,
    COMPETITIVE,
    CLEAR_BODY,
    INNER_FOCUS,
    GUARD_DOG,
  ]
  const CAUSES: readonly StageCause[] = ['own-move', 'intimidate']
  const STAGES = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const
  const CHANGES: readonly StageChange[] = [-2, -1, 1, 2].flatMap((stages) =>
    (['atk', 'def', 'spa', 'spd', 'spe'] as const).map((stat) => ({ stat, stages })),
  )

  const outcomes = RESPONSES.flatMap((response) =>
    CAUSES.flatMap((cause) =>
      CHANGES.flatMap((change) =>
        STAGES.map((stage) => land(change, cause, response, { [change.stat]: stage })),
      ),
    ),
  )

  it('covers every combination', () => {
    expect(outcomes.length).toBe(8 * 2 * 20 * 13)
  })

  it('never leaves a stage outside -6 to +6', () => {
    const outside = outcomes.filter((boosts) =>
      Object.values(boosts).some((stage) => stage < -6 || stage > 6),
    )
    expect(outside).toEqual([])
  })
})
