import { describe, expect, it } from 'vitest'
import type { PokemonType, TeraType } from '../../src/index.js'
import { stabModifier } from '../../src/damage/index.js'

const GARCHOMP: readonly PokemonType[] = ['dragon', 'ground']

type Case = {
  readonly moveType: TeraType
  readonly teraType: TeraType | null
  readonly terastallized: boolean
  readonly adaptability: boolean
}

function stab(input: Case): number {
  return stabModifier({ ...input, originalTypes: GARCHOMP })
}

describe('stabModifier without Terastallization', () => {
  it('gives 1.5x on an original type', () => {
    expect(
      stab({ moveType: 'dragon', teraType: null, terastallized: false, adaptability: false }),
    ).toBe(6144)
  })

  it('gives 2x on an original type with Adaptability', () => {
    expect(
      stab({ moveType: 'dragon', teraType: null, terastallized: false, adaptability: true }),
    ).toBe(8192)
  })

  it('gives nothing off type', () => {
    expect(
      stab({ moveType: 'water', teraType: null, terastallized: false, adaptability: false }),
    ).toBe(4096)
  })

  it('gives nothing off type even with Adaptability', () => {
    expect(
      stab({ moveType: 'water', teraType: null, terastallized: false, adaptability: true }),
    ).toBe(4096)
  })
})

describe('stabModifier when Terastallized', () => {
  it('gives 2x when the Tera type, the move and an original type all agree', () => {
    expect(
      stab({ moveType: 'dragon', teraType: 'dragon', terastallized: true, adaptability: false }),
    ).toBe(8192)
  })

  it('gives 2.25x for that case with Adaptability', () => {
    expect(
      stab({ moveType: 'dragon', teraType: 'dragon', terastallized: true, adaptability: true }),
    ).toBe(9216)
  })

  it('gives 1.5x on a Tera type that was never an original type', () => {
    expect(
      stab({ moveType: 'water', teraType: 'water', terastallized: true, adaptability: false }),
    ).toBe(6144)
  })

  it('gives 2x for that case with Adaptability', () => {
    expect(
      stab({ moveType: 'water', teraType: 'water', terastallized: true, adaptability: true }),
    ).toBe(8192)
  })

  it('keeps 1.5x on an original type the Tera type did not match', () => {
    expect(
      stab({ moveType: 'dragon', teraType: 'fire', terastallized: true, adaptability: false }),
    ).toBe(6144)
  })

  it('keeps 2x for that case with Adaptability', () => {
    expect(
      stab({ moveType: 'dragon', teraType: 'fire', terastallized: true, adaptability: true }),
    ).toBe(8192)
  })

  it('gives nothing when neither the Tera type nor an original type matches', () => {
    expect(
      stab({ moveType: 'water', teraType: 'fire', terastallized: true, adaptability: false }),
    ).toBe(4096)
  })
})

describe('stabModifier under Stellar', () => {
  it('gives 2x to a move matching an original type', () => {
    expect(
      stab({ moveType: 'ground', teraType: 'stellar', terastallized: true, adaptability: false }),
    ).toBe(8192)
  })

  it('gives 1.2x to everything else', () => {
    expect(
      stab({ moveType: 'water', teraType: 'stellar', terastallized: true, adaptability: false }),
    ).toBe(4915)
  })
})

describe('stabModifier with no Tera type chosen', () => {
  it('falls back to the untera bonus', () => {
    expect(
      stab({ moveType: 'dragon', teraType: null, terastallized: true, adaptability: false }),
    ).toBe(6144)
  })
})
