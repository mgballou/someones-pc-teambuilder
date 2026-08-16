import { describe, expect, it } from 'vitest'
import {
  applyModifier,
  chainModifiers,
  MOD_ONE,
  modifierFromRatio,
  pokeRound,
} from '../../src/damage/index.js'

describe('pokeRound', () => {
  it('rounds a half down', () => {
    expect(pokeRound(91.5)).toBe(91)
  })

  it('rounds just above a half up', () => {
    expect(pokeRound(91.5001)).toBe(92)
  })

  it('rounds below a half down', () => {
    expect(pokeRound(91.4)).toBe(91)
  })

  it('leaves integers alone', () => {
    expect(pokeRound(91)).toBe(91)
  })
})

describe('applyModifier', () => {
  it('applies 1.5x as 6144 over 4096', () => {
    expect(applyModifier(200, 6144)).toBe(300)
  })

  it('applies Life Orb to a neutral roll', () => {
    expect(applyModifier(180, 5324)).toBe(234)
  })
})

describe('chainModifiers', () => {
  it('is the identity for an empty chain', () => {
    expect(chainModifiers([])).toBe(MOD_ONE)
  })

  it('skips nulls', () => {
    expect(chainModifiers([null, 6144, null])).toBe(6144)
  })

  it('multiplies two modifiers into one', () => {
    expect(chainModifiers([6144, 2048])).toBe(3072)
  })
})

describe('modifierFromRatio', () => {
  it('truncates 1.2x to the game constant', () => {
    expect(modifierFromRatio(1.2)).toBe(4915)
  })

  it('truncates 1.1x to the game constant', () => {
    expect(modifierFromRatio(1.1)).toBe(4505)
  })

  it('leaves 1.5x exact', () => {
    expect(modifierFromRatio(1.5)).toBe(6144)
  })
})
