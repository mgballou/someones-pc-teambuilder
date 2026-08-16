import { describe, expect, it } from 'vitest'
import type { MoveId, TeraType } from '../../src/index.js'
import { moveId, ZERO_BOOSTS } from '../../src/index.js'
import type { Field } from '../../src/damage/index.js'
import { calculate, DEFAULT_FIELD, newAttacker, newDefender } from '../../src/damage/index.js'
import { fixtureDex } from '../fixtures/dex.js'
import { buildSet, dexWithItem, makeItem } from './helpers.js'

const EARTHQUAKE = moveId('earthquake')
const DRAGON_CLAW = moveId('dragon-claw')
const HYDRO_PUMP = moveId('hydro-pump')
const SWORDS_DANCE = moveId('swords-dance')

const chomp = buildSet({
  species: 'garchomp',
  nature: 'adamant',
  evs: { atk: 252 },
  item: 'life-orb',
})

const rotom = buildSet({ species: 'rotom-wash', nature: 'calm', evs: { hp: 252 } })

const dondozo = buildSet({ species: 'dondozo', nature: 'impish', evs: { hp: 252, def: 252 } })

describe('the Life Orb Garchomp baseline', () => {
  const result = calculate({
    attacker: newAttacker({ set: chomp }),
    defender: newDefender({ set: rotom }),
    move: EARTHQUAKE,
    field: DEFAULT_FIELD,
    dex: fixtureDex,
  })

  it('produces the hand-verified sixteen rolls', () => {
    expect(result.rolls).toEqual([
      234, 237, 237, 242, 244, 244, 250, 252, 257, 257, 260, 265, 265, 268, 273, 276,
    ])
  })

  it('reports the lowest roll', () => {
    expect(result.min).toBe(234)
  })

  it('reports the highest roll', () => {
    expect(result.max).toBe(276)
  })

  it('computes the attacking stat', () => {
    expect(result.attackStat).toBe(200)
  })

  it('computes the defending stat', () => {
    expect(result.defenseStat).toBe(127)
  })

  it('computes the defender maximum HP', () => {
    expect(result.defenderMaxHp).toBe(157)
  })

  it('reports the type multiplier', () => {
    expect(result.effectiveness).toBe(2)
  })

  it('reports the same-type bonus', () => {
    expect(result.stab).toBe(1.5)
  })

  it('reports the damage as a percentage floor', () => {
    expect(result.percent.min).toBe(149)
  })

  it('reports the damage as a percentage ceiling', () => {
    expect(result.percent.max).toBe(175.8)
  })

  it('names the knockout', () => {
    expect(result.ko.summary).toBe('guaranteed OHKO')
  })

  it('has nothing to apologize for', () => {
    expect(result.notes).toEqual([])
  })
})

describe('immunity', () => {
  const byAbility = calculate({
    attacker: newAttacker({ set: chomp }),
    defender: newDefender({ set: buildSet({ species: 'rotom-wash', ability: 'levitate' }) }),
    move: EARTHQUAKE,
    field: DEFAULT_FIELD,
    dex: fixtureDex,
  })

  const byType = calculate({
    attacker: newAttacker({ set: chomp }),
    defender: newDefender({ set: buildSet({ species: 'landorus-therian' }) }),
    move: EARTHQUAKE,
    field: DEFAULT_FIELD,
    dex: fixtureDex,
  })

  it('returns sixteen zeroes against Levitate', () => {
    expect(byAbility.rolls).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('flags the result as an immunity', () => {
    expect(byAbility.immune).toBe(true)
  })

  it('says Levitate was the reason', () => {
    expect(byAbility.notes.join('\n')).toMatch(/^Levitate makes .+ immune to Ground\.$/)
  })

  it('reports no knockout', () => {
    expect(byAbility.ko.kind).toBe('none')
  })

  it('returns sixteen zeroes against a Flying type', () => {
    expect(byType.rolls).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('says the typing was the reason', () => {
    expect(byType.notes).toContain('Ground does not affect Flying types.')
  })
})

describe('spread reduction', () => {
  const doubles: Field = { ...DEFAULT_FIELD, style: 'doubles' }

  const single = calculate({
    attacker: newAttacker({ set: chomp, targets: 1 }),
    defender: newDefender({ set: dondozo }),
    move: EARTHQUAKE,
    field: doubles,
    dex: fixtureDex,
  })

  const spread = calculate({
    attacker: newAttacker({ set: chomp, targets: 2 }),
    defender: newDefender({ set: dondozo }),
    move: EARTHQUAKE,
    field: doubles,
    dex: fixtureDex,
  })

  it('lowers the ceiling', () => {
    expect(spread.max).toBeLessThan(single.max)
  })

  it('lowers the floor', () => {
    expect(spread.min).toBeLessThan(single.min)
  })

  it('leaves a single-target move alone', () => {
    const claw = calculate({
      attacker: newAttacker({ set: chomp, targets: 2 }),
      defender: newDefender({ set: dondozo }),
      move: DRAGON_CLAW,
      field: doubles,
      dex: fixtureDex,
    })
    expect(claw.notes).toContain(
      'Dragon Claw only ever hits one Pokémon, so no spread reduction was applied despite 2 targets.',
    )
  })
})

describe('Tera STAB through the calculator', () => {
  function stabOf(teraType: TeraType | null, move: MoveId): number {
    const set = buildSet({
      species: 'garchomp',
      nature: 'adamant',
      evs: { atk: 252, spa: 252 },
      teraType,
    })
    return calculate({
      attacker: newAttacker({ set, terastallized: teraType !== null }),
      defender: newDefender({ set: dondozo }),
      move,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    }).stab
  }

  it('gives 1.5x on an original type without Terastallizing', () => {
    expect(stabOf(null, DRAGON_CLAW)).toBe(1.5)
  })

  it('gives 2x when the Tera type is the move type and an original type', () => {
    expect(stabOf('dragon', DRAGON_CLAW)).toBe(2)
  })

  it('gives 1.5x when the Tera type is the move type but never an original', () => {
    expect(stabOf('water', HYDRO_PUMP)).toBe(1.5)
  })

  it('gives 1.5x on an original type the Tera type did not match', () => {
    expect(stabOf('fire', DRAGON_CLAW)).toBe(1.5)
  })

  it('gives nothing when neither typing matches', () => {
    expect(stabOf('fire', HYDRO_PUMP)).toBe(1)
  })
})

describe('Stellar', () => {
  const flutter = buildSet({
    species: 'flutter-mane',
    nature: 'modest',
    evs: { spa: 252 },
    teraType: 'stellar',
  })

  it('hits a Terastallized target for double', () => {
    const result = calculate({
      attacker: newAttacker({ set: flutter, terastallized: true }),
      defender: newDefender({
        set: buildSet({ species: 'dondozo', teraType: 'water' }),
        terastallized: true,
      }),
      move: moveId('tera-blast'),
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    })
    expect(result.effectiveness).toBe(2)
  })

  it('is neutral against a target that has not Terastallized', () => {
    const result = calculate({
      attacker: newAttacker({ set: flutter, terastallized: true }),
      defender: newDefender({ set: dondozo }),
      move: moveId('tera-blast'),
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    })
    expect(result.effectiveness).toBe(1)
  })
})

describe('Eviolite', () => {
  function intoDusclops(item: string | null): number {
    return calculate({
      attacker: newAttacker({ set: chomp }),
      defender: newDefender({ set: buildSet({ species: 'dusclops', evs: { hp: 252 }, item }) }),
      move: EARTHQUAKE,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    }).max
  }

  function intoGarchomp(item: string | null): readonly number[] {
    return calculate({
      attacker: newAttacker({
        set: buildSet({ species: 'dragonite', nature: 'adamant', evs: { atk: 252 } }),
      }),
      defender: newDefender({ set: buildSet({ species: 'garchomp', evs: { hp: 252 }, item }) }),
      move: DRAGON_CLAW,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    }).rolls
  }

  it('cuts damage against a Pokémon that can still evolve', () => {
    expect(intoDusclops('eviolite')).toBeLessThan(intoDusclops(null))
  })

  it('does nothing for a fully evolved Pokémon', () => {
    expect(intoGarchomp('eviolite')).toEqual(intoGarchomp(null))
  })
})

describe('burn', () => {
  function physical(status: 'burn' | 'none'): number {
    return calculate({
      attacker: newAttacker({
        set: buildSet({ species: 'garchomp', nature: 'adamant', evs: { atk: 252 } }),
        status,
      }),
      defender: newDefender({ set: dondozo }),
      move: EARTHQUAKE,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    }).max
  }

  function special(status: 'burn' | 'none'): readonly number[] {
    return calculate({
      attacker: newAttacker({
        set: buildSet({ species: 'rotom-wash', nature: 'modest', evs: { spa: 252 } }),
        status,
      }),
      defender: newDefender({ set: dondozo }),
      move: HYDRO_PUMP,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    }).rolls
  }

  it('halves a physical move', () => {
    expect(physical('burn')).toBe(Math.floor(physical('none') / 2))
  })

  it('leaves a special move alone', () => {
    expect(special('burn')).toEqual(special('none'))
  })
})

describe('a critical hit', () => {
  function into(defenseStage: number, criticalHit: boolean): readonly number[] {
    return calculate({
      attacker: newAttacker({ set: chomp, criticalHit }),
      defender: newDefender({ set: dondozo, boosts: { ...ZERO_BOOSTS, def: defenseStage } }),
      move: EARTHQUAKE,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    }).rolls
  }

  it('reads through a +2 Def', () => {
    expect(into(2, true)).toEqual(into(0, true))
  })

  it('is the only thing that does', () => {
    expect(into(2, false)[15]).toBeLessThan(into(0, false)[15] ?? 0)
  })
})

describe('honesty', () => {
  it('names an item whose effect is outside the model', () => {
    const oddity = makeItem('punching-glove', { kind: 'unmodelled' })
    const result = calculate({
      attacker: newAttacker({
        set: buildSet({ species: 'garchomp', nature: 'adamant', item: 'punching-glove' }),
      }),
      defender: newDefender({ set: dondozo }),
      move: EARTHQUAKE,
      field: DEFAULT_FIELD,
      dex: dexWithItem(oddity),
    })
    expect(result.notes).toContain("Punching Glove's effect is outside the damage model.")
  })

  it('names an ability outside the registry', () => {
    const result = calculate({
      attacker: newAttacker({
        set: buildSet({ species: 'garchomp', nature: 'adamant', ability: 'serene-grace' }),
      }),
      defender: newDefender({ set: dondozo }),
      move: EARTHQUAKE,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    })
    expect(result.notes).toContain(
      "Garchomp's serene-grace is outside the damage model and was not applied.",
    )
  })

  it('says nothing about an ability it models as inert', () => {
    const result = calculate({
      attacker: newAttacker({
        set: buildSet({ species: 'garchomp', nature: 'adamant', ability: 'rough-skin' }),
      }),
      defender: newDefender({ set: dondozo }),
      move: EARTHQUAKE,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    })
    expect(result.notes).toEqual([])
  })

  it('names an item id the dataset has never heard of', () => {
    const result = calculate({
      attacker: newAttacker({ set: buildSet({ species: 'garchomp', item: 'never-melt-ice' }) }),
      defender: newDefender({ set: dondozo }),
      move: EARTHQUAKE,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    })
    expect(result.notes).toContain(
      'No item in the dataset with id "never-melt-ice", so it was ignored.',
    )
  })

  it('warns that the defender is holding something the KO estimate ignores', () => {
    const result = calculate({
      attacker: newAttacker({ set: chomp }),
      defender: newDefender({ set: buildSet({ species: 'dondozo', item: 'focus-sash' }) }),
      move: EARTHQUAKE,
      field: DEFAULT_FIELD,
      dex: fixtureDex,
    })
    expect(result.notes).toContain('Focus Sash is not accounted for in the KO estimate.')
  })
})

describe('refusals', () => {
  it('will not calculate a status move', () => {
    expect(() =>
      calculate({
        attacker: newAttacker({ set: chomp }),
        defender: newDefender({ set: dondozo }),
        move: SWORDS_DANCE,
        field: DEFAULT_FIELD,
        dex: fixtureDex,
      }),
    ).toThrowError(/status move/)
  })
})
