import { describe, expect, it } from 'vitest'
import { koChance } from '../../src/damage/index.js'

function flat(damage: number): readonly number[] {
  return Array.from({ length: 16 }, () => damage)
}

describe('koChance', () => {
  it('reports no KO when nothing lands', () => {
    expect(koChance({ rolls: flat(0), currentHp: 100 }).kind).toBe('none')
  })

  it('names a guaranteed OHKO', () => {
    expect(koChance({ rolls: flat(200), currentHp: 157 }).summary).toBe('guaranteed OHKO')
  })

  it('names a guaranteed 2HKO', () => {
    expect(koChance({ rolls: flat(80), currentHp: 157 }).summary).toBe('guaranteed 2HKO')
  })

  it('counts the rolls that reach the faster knockout', () => {
    const rolls = [...Array.from({ length: 10 }, () => 90), ...Array.from({ length: 6 }, () => 110)]
    expect(koChance({ rolls, currentHp: 100 }).summary).toBe(
      '6 of 16 rolls to OHKO, otherwise 2HKO',
    )
  })

  it('exposes the roll count as data, not only as prose', () => {
    const rolls = [...Array.from({ length: 10 }, () => 90), ...Array.from({ length: 6 }, () => 110)]
    const chance = koChance({ rolls, currentHp: 100 })
    expect(chance.kind === 'chance' ? chance.rolls : null).toBe(6)
  })

  it('measures against remaining HP, not maximum HP', () => {
    expect(koChance({ rolls: flat(80), currentHp: 79 }).summary).toBe('guaranteed OHKO')
  })
})
