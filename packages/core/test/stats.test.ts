import { describe, expect, test } from 'vitest'
import {
  BOOSTABLE_STATS,
  EMPTY_EVS,
  MAX_EV_TOTAL,
  NATURES,
  PERFECT_IVS,
  applyBoost,
  computeHp,
  computeSpread,
  computeStat,
  evsRemaining,
  natureMultiplier,
  naturesLowering,
  naturesRaising,
  totalEvs,
} from '../src/index'

/**
 * Every number here is checked against the games. A stat that is one point
 * wrong is a calculator that lies, so these are exact rather than approximate.
 */

describe('computeHp', () => {
  test('max-invested Garchomp at 50', () => {
    expect(computeHp({ base: 108, iv: 31, ev: 252, level: 50 })).toBe(215)
  })

  test('uninvested Garchomp at 50', () => {
    expect(computeHp({ base: 108, iv: 31, ev: 0, level: 50 })).toBe(183)
  })

  test('max-invested Garchomp at 100', () => {
    expect(computeHp({ base: 108, iv: 31, ev: 252, level: 100 })).toBe(420)
  })

  test('Shedinja is always 1', () => {
    expect(computeHp({ base: 1, iv: 31, ev: 252, level: 100 })).toBe(1)
  })
})

describe('computeStat', () => {
  test('Adamant max Attack Garchomp at 50', () => {
    expect(computeStat({ base: 130, iv: 31, ev: 252, level: 50 }, 'adamant', 'atk')).toBe(200)
  })

  test('Jolly max Attack Garchomp at 50 loses the nature boost', () => {
    expect(computeStat({ base: 130, iv: 31, ev: 252, level: 50 }, 'jolly', 'atk')).toBe(182)
  })

  test('Jolly max Speed Garchomp at 50', () => {
    expect(computeStat({ base: 102, iv: 31, ev: 252, level: 50 }, 'jolly', 'spe')).toBe(169)
  })

  test('a hindering nature truncates rather than rounds', () => {
    expect(computeStat({ base: 130, iv: 31, ev: 252, level: 50 }, 'modest', 'atk')).toBe(163)
  })

  test('four EVs is worth one point at level 50 on an even base', () => {
    const none = computeStat({ base: 100, iv: 31, ev: 0, level: 50 }, 'hardy', 'atk')
    const four = computeStat({ base: 100, iv: 31, ev: 4, level: 50 }, 'hardy', 'atk')
    expect(four - none).toBe(1)
  })
})

describe('natures', () => {
  test('there are twenty-five', () => {
    expect(NATURES).toHaveLength(25)
  })

  test('Adamant raises Attack', () => {
    expect(natureMultiplier('adamant', 'atk')).toBe(1.1)
  })

  test('Adamant lowers Special Attack', () => {
    expect(natureMultiplier('adamant', 'spa')).toBe(0.9)
  })

  test('a neutral nature touches nothing', () => {
    expect(BOOSTABLE_STATS.map((stat) => natureMultiplier('hardy', stat))).toEqual([1, 1, 1, 1, 1])
  })

  test('no nature ever changes HP', () => {
    expect(NATURES.map((nature) => natureMultiplier(nature, 'hp'))).toEqual(NATURES.map(() => 1))
  })

  test('exactly four natures raise each stat', () => {
    expect(BOOSTABLE_STATS.map((stat) => naturesRaising(stat).length)).toEqual([4, 4, 4, 4, 4])
  })

  test('exactly four natures lower each stat', () => {
    expect(BOOSTABLE_STATS.map((stat) => naturesLowering(stat).length)).toEqual([4, 4, 4, 4, 4])
  })
})

describe('applyBoost', () => {
  test('+1 is one and a half', () => {
    expect(applyBoost(200, 1)).toBe(300)
  })

  test('+2 is double', () => {
    expect(applyBoost(200, 2)).toBe(400)
  })

  test('+6 is four times', () => {
    expect(applyBoost(100, 6)).toBe(400)
  })

  test('-1 is two thirds, truncated', () => {
    expect(applyBoost(200, -1)).toBe(133)
  })

  test('-6 is a quarter', () => {
    expect(applyBoost(200, -6)).toBe(50)
  })

  test('stages clamp beyond six', () => {
    expect(applyBoost(100, 99)).toBe(applyBoost(100, 6))
  })
})

describe('computeSpread', () => {
  const spread = computeSpread({
    base: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    ivs: PERFECT_IVS,
    evs: { ...EMPTY_EVS, atk: 252, spe: 252, hp: 4 },
    level: 50,
    nature: 'jolly',
  })

  test('computes every stat in one pass', () => {
    expect(spread).toEqual({ hp: 184, atk: 182, def: 115, spa: 90, spd: 105, spe: 169 })
  })
})

describe('EV accounting', () => {
  test('totals across all six stats', () => {
    expect(totalEvs({ ...EMPTY_EVS, hp: 252, atk: 252, spe: 4 })).toBe(508)
  })

  test('a full spread has nothing remaining', () => {
    expect(evsRemaining({ ...EMPTY_EVS, hp: 252, atk: 252, spe: 4 })).toBe(0)
  })

  test('an empty spread has the whole budget', () => {
    expect(evsRemaining(EMPTY_EVS)).toBe(MAX_EV_TOTAL)
  })
})
