import { describe, expect, it } from 'vitest'
import { fixtureDex } from '../fixtures/dex'
import { EMPTY_EVS, newSet, PERFECT_IVS, speciesId } from '../../src/index'
import { defaultLevelFor, serialize } from '../../src/showdown/index'
import { NICKNAMED_SET, VARIED_SETS } from './fixtures'

const CANONICAL = [
  'Sharkbait (Garchomp) (M) @ Choice Band',
  'Ability: Rough Skin',
  'Tera Type: Ground',
  'EVs: 252 Atk / 4 Def / 252 Spe',
  'Adamant Nature',
  'IVs: 0 SpA',
  '- Earthquake',
  '- Dragon Claw',
  '- Swords Dance',
  '- Protect',
].join('\n')

describe('serialize', () => {
  it('writes the standard shape', () => {
    expect(serialize({ set: NICKNAMED_SET, dex: fixtureDex })).toBe(CANONICAL)
  })

  it('omits every default line', () => {
    const set = { ...newSet({ id: NICKNAMED_SET.id, species: speciesId('dondozo') }) }
    expect(serialize({ set, dex: fixtureDex })).toBe('Dondozo\nHardy Nature')
  })

  it('marks a female set', () => {
    const set = { ...NICKNAMED_SET, gender: 'female' as const }
    expect(serialize({ set, dex: fixtureDex })).toContain('(Garchomp) (F) @')
  })

  it('leaves a genderless set unmarked', () => {
    const set = { ...NICKNAMED_SET, gender: 'genderless' as const }
    expect(serialize({ set, dex: fixtureDex })).toContain('(Garchomp) @')
  })

  it('writes shiny', () => {
    const set = { ...NICKNAMED_SET, shiny: true }
    expect(serialize({ set, dex: fixtureDex })).toContain('Shiny: Yes')
  })

  it('writes gigantamax', () => {
    const set = { ...NICKNAMED_SET, gigantamax: true }
    expect(serialize({ set, dex: fixtureDex })).toContain('Gigantamax: Yes')
  })

  it('writes Stellar as a Tera type', () => {
    const set = { ...NICKNAMED_SET, teraType: 'stellar' as const }
    expect(serialize({ set, dex: fixtureDex })).toContain('Tera Type: Stellar')
  })

  it('drops the EV line when nothing is spent', () => {
    const set = { ...NICKNAMED_SET, evs: EMPTY_EVS }
    expect(serialize({ set, dex: fixtureDex })).not.toContain('EVs:')
  })

  it('drops the IV line when every IV is perfect', () => {
    const set = { ...NICKNAMED_SET, ivs: PERFECT_IVS }
    expect(serialize({ set, dex: fixtureDex })).not.toContain('IVs:')
  })

  it('lists stats in canonical order', () => {
    const set = {
      ...NICKNAMED_SET,
      evs: { hp: 4, atk: 8, def: 12, spa: 16, spd: 20, spe: 24 },
    }
    expect(serialize({ set, dex: fixtureDex })).toContain(
      'EVs: 4 HP / 8 Atk / 12 Def / 16 SpA / 20 SpD / 24 Spe',
    )
  })

  it('writes only filled move slots', () => {
    const set = { ...NICKNAMED_SET, moves: [null, null, null, null] as const }
    expect(serialize({ set, dex: fixtureDex })).not.toContain('- ')
  })

  it('never writes a blank line inside one set', () => {
    const pastes = VARIED_SETS.map((set) => serialize({ set, dex: fixtureDex }))
    expect(pastes.some((paste) => paste.includes('\n\n'))).toBe(false)
  })
})

describe('defaultLevelFor', () => {
  it('takes a fixed rule at its level', () => {
    const format = fixtureDex.allFormats().find((entry) => entry.level.kind === 'fixed')
    expect(format === undefined ? null : defaultLevelFor(format)).toBe(50)
  })

  it('takes a capped rule at its maximum', () => {
    const format = fixtureDex.allFormats().find((entry) => entry.level.kind === 'capped')
    expect(format === undefined ? null : defaultLevelFor(format)).toBe(100)
  })
})
