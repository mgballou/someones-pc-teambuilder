import { describe, expect, it } from 'vitest'
import type { MoveId, Nature, StatSpread } from '../../src/index'
import { applyBoost, moveId, ZERO_BOOSTS } from '../../src/index'
import type { DamageResult, Field, Terrain, Weather } from '../../src/damage/index'
import {
  calculate,
  DEFAULT_FIELD,
  newAttacker,
  newDefender,
  OPEN_SIDE,
} from '../../src/damage/index'
import { fixtureDex } from '../fixtures/dex'
import { buildSet } from './helpers'

const EARTHQUAKE = moveId('earthquake')
const DRAGON_CLAW = moveId('dragon-claw')
const HYDRO_PUMP = moveId('hydro-pump')
const FLAMETHROWER = moveId('flamethrower')
const THUNDERBOLT = moveId('thunderbolt')
const SHADOW_BALL = moveId('shadow-ball')
const MOONBLAST = moveId('moonblast')
const FAKE_OUT = moveId('fake-out')
const SURGING_STRIKES = moveId('surging-strikes')
const BODY_PRESS = moveId('body-press')
const METEOR_BEAM = moveId('meteor-beam')
const SOLAR_BEAM = moveId('solar-beam')

type Scenario = {
  readonly attackerSpecies: string
  readonly move: MoveId
  readonly nature?: Nature
  readonly attackerEvs?: Partial<StatSpread>
  readonly attackerItem?: string | null
  readonly attackerAbility?: string | null
  readonly defenderSpecies?: string
  readonly defenderItem?: string | null
  readonly defenderAbility?: string | null
  readonly defenderHpFraction?: number
  readonly weather?: Weather
  readonly terrain?: Terrain
  readonly reflect?: boolean
  readonly style?: Field['style']
  readonly status?: 'burn' | 'none'
  readonly defenseBoost?: number
}

function run({
  attackerSpecies,
  move,
  nature = 'adamant',
  attackerEvs = { atk: 252, spa: 252 },
  attackerItem = null,
  attackerAbility = null,
  defenderSpecies = 'dondozo',
  defenderItem = null,
  defenderAbility = null,
  defenderHpFraction = 1,
  weather = 'none',
  terrain = 'none',
  reflect = false,
  style = 'singles',
  status = 'none',
  defenseBoost = 0,
}: Scenario): DamageResult {
  return calculate({
    attacker: newAttacker({
      set: buildSet({
        species: attackerSpecies,
        nature,
        evs: attackerEvs,
        item: attackerItem,
        ability: attackerAbility,
      }),
      status,
    }),
    defender: newDefender({
      set: buildSet({
        species: defenderSpecies,
        evs: { hp: 252 },
        item: defenderItem,
        ability: defenderAbility,
      }),
      hpFraction: defenderHpFraction,
      boosts: { ...ZERO_BOOSTS, def: defenseBoost },
    }),
    move,
    field: {
      ...DEFAULT_FIELD,
      weather,
      terrain,
      style,
      defenderSide: { ...OPEN_SIDE, reflect },
    },
    dex: fixtureDex,
  })
}

describe('item registry', () => {
  it('gives Choice Band 1.5x Attack', () => {
    expect(
      run({ attackerSpecies: 'garchomp', move: EARTHQUAKE, attackerItem: 'choice-band' })
        .attackStat,
    ).toBe(300)
  })

  it('leaves Choice Specs out of a physical calculation', () => {
    expect(
      run({ attackerSpecies: 'garchomp', move: EARTHQUAKE, attackerItem: 'choice-specs' })
        .attackStat,
    ).toBe(200)
  })

  it('gives Muscle Band 1.1x base power', () => {
    expect(
      run({ attackerSpecies: 'garchomp', move: EARTHQUAKE, attackerItem: 'muscle-band' }).basePower,
    ).toBe(110)
  })

  it('gives Charcoal 1.2x base power on a Fire move', () => {
    expect(
      run({ attackerSpecies: 'incineroar', move: FLAMETHROWER, attackerItem: 'charcoal' })
        .basePower,
    ).toBe(108)
  })

  it('leaves Charcoal out of a Water calculation', () => {
    expect(
      run({ attackerSpecies: 'urshifu-rapid-strike', move: HYDRO_PUMP, attackerItem: 'charcoal' })
        .basePower,
    ).toBe(110)
  })

  it('applies Expert Belt only on a super-effective hit', () => {
    const boosted = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      attackerItem: 'expert-belt',
      defenderSpecies: 'rotom-wash',
    })
    const plain = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      defenderSpecies: 'rotom-wash',
    })
    expect(boosted.max).toBeGreaterThan(plain.max)
  })

  it('withholds Expert Belt on a neutral hit', () => {
    const boosted = run({
      attackerSpecies: 'garchomp',
      move: DRAGON_CLAW,
      attackerItem: 'expert-belt',
    })
    const plain = run({ attackerSpecies: 'garchomp', move: DRAGON_CLAW })
    expect(boosted.rolls).toEqual(plain.rolls)
  })

  it('gives Assault Vest 1.5x Special Defense', () => {
    const vest = run({
      attackerSpecies: 'rotom-wash',
      nature: 'modest',
      move: HYDRO_PUMP,
      defenderItem: 'assault-vest',
    })
    const bare = run({ attackerSpecies: 'rotom-wash', nature: 'modest', move: HYDRO_PUMP })
    expect(vest.defenseStat).toBe(Math.floor((bare.defenseStat * 3) / 2))
  })
})

describe('ability registry', () => {
  it('doubles Attack for Huge Power', () => {
    expect(
      run({ attackerSpecies: 'garchomp', move: EARTHQUAKE, attackerAbility: 'huge-power' })
        .attackStat,
    ).toBe(400)
  })

  it('gives Guts 1.5x Attack when burned', () => {
    expect(
      run({
        attackerSpecies: 'garchomp',
        move: EARTHQUAKE,
        attackerAbility: 'guts',
        status: 'burn',
      }).attackStat,
    ).toBe(300)
  })

  it('stops the burn from halving a Guts attacker', () => {
    const guts = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      attackerAbility: 'guts',
      status: 'burn',
    })
    const plain = run({ attackerSpecies: 'garchomp', move: EARTHQUAKE, status: 'burn' })
    expect(guts.max).toBeGreaterThan(plain.max * 2)
  })

  it('raises Technician base power by half under sixty', () => {
    expect(
      run({ attackerSpecies: 'garchomp', move: FAKE_OUT, attackerAbility: 'technician' }).basePower,
    ).toBe(60)
  })

  it('leaves Technician out above sixty', () => {
    expect(
      run({ attackerSpecies: 'garchomp', move: EARTHQUAKE, attackerAbility: 'technician' })
        .basePower,
    ).toBe(100)
  })

  it('doubles a resisted hit for Tinted Lens', () => {
    const tinted = run({
      attackerSpecies: 'flutter-mane',
      nature: 'modest',
      move: SHADOW_BALL,
      attackerAbility: 'tinted-lens',
      defenderSpecies: 'incineroar',
    })
    const plain = run({
      attackerSpecies: 'flutter-mane',
      nature: 'modest',
      move: SHADOW_BALL,
      defenderSpecies: 'incineroar',
    })
    expect(tinted.max).toBe(plain.max * 2)
  })

  it('cuts a super-effective hit for Solid Rock', () => {
    const solid = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      defenderSpecies: 'rotom-wash',
      defenderAbility: 'solid-rock',
    })
    const plain = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      defenderSpecies: 'rotom-wash',
    })
    expect(solid.max).toBeLessThan(plain.max)
  })

  it('halves a hit into a full-HP Multiscale', () => {
    const full = run({
      attackerSpecies: 'garchomp',
      move: DRAGON_CLAW,
      defenderSpecies: 'dragonite',
      defenderAbility: 'multiscale',
    })
    const chipped = run({
      attackerSpecies: 'garchomp',
      move: DRAGON_CLAW,
      defenderSpecies: 'dragonite',
      defenderAbility: 'multiscale',
      defenderHpFraction: 0.99,
    })
    expect(full.max).toBeLessThan(chipped.max)
  })

  it('halves a Fire attacker against Thick Fat', () => {
    const fat = run({
      attackerSpecies: 'incineroar',
      move: FLAMETHROWER,
      nature: 'modest',
      defenderAbility: 'thick-fat',
    })
    const plain = run({ attackerSpecies: 'incineroar', move: FLAMETHROWER, nature: 'modest' })
    expect(fat.attackStat).toBe(Math.floor(plain.attackStat / 2))
  })

  it('lowers the defender Def by a quarter for Sword of Ruin', () => {
    const ruin = run({
      attackerSpecies: 'chien-pao',
      move: DRAGON_CLAW,
      attackerAbility: 'sword-of-ruin',
    })
    const plain = run({ attackerSpecies: 'chien-pao', move: DRAGON_CLAW })
    expect(ruin.defenseStat).toBe(Math.floor((plain.defenseStat * 3) / 4))
  })

  it('drops the attacker a stage for Intimidate', () => {
    const intimidated = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      defenderAbility: 'intimidate',
    })
    expect(intimidated.attackStat).toBe(133)
  })

  it('says Intimidate was applied rather than applying it silently', () => {
    const intimidated = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      defenderAbility: 'intimidate',
    })
    expect(
      intimidated.notes.some((note) => note.startsWith('Intimidate was applied as -1 Atk')),
    ).toBe(true)
  })

  it('gives Protosynthesis 1.3x its highest stat in sun', () => {
    expect(
      run({
        attackerSpecies: 'flutter-mane',
        nature: 'modest',
        attackerEvs: { spa: 252 },
        move: MOONBLAST,
        attackerAbility: 'protosynthesis',
        weather: 'sun',
      }).attackStat,
    ).toBe(267)
  })

  it('leaves Protosynthesis dormant without sun or Booster Energy', () => {
    expect(
      run({
        attackerSpecies: 'flutter-mane',
        nature: 'modest',
        attackerEvs: { spa: 252 },
        move: MOONBLAST,
        attackerAbility: 'protosynthesis',
      }).attackStat,
    ).toBe(205)
  })

  it('wakes Protosynthesis with Booster Energy', () => {
    expect(
      run({
        attackerSpecies: 'flutter-mane',
        nature: 'modest',
        attackerEvs: { spa: 252 },
        move: MOONBLAST,
        attackerAbility: 'protosynthesis',
        attackerItem: 'booster-energy',
      }).attackStat,
    ).toBe(267)
  })

  it('gives Hadron Engine four thirds under Electric Terrain', () => {
    const powered = run({
      attackerSpecies: 'miraidon',
      nature: 'modest',
      attackerEvs: { spa: 252 },
      move: MOONBLAST,
      attackerAbility: 'hadron-engine',
      terrain: 'electric',
    })
    const flat = run({
      attackerSpecies: 'miraidon',
      nature: 'modest',
      attackerEvs: { spa: 252 },
      move: MOONBLAST,
    })
    expect(powered.attackStat).toBeGreaterThan(flat.attackStat)
  })

  it('says Hadron Engine did nothing when the terrain is not up', () => {
    const flat = run({
      attackerSpecies: 'miraidon',
      nature: 'modest',
      move: MOONBLAST,
      attackerAbility: 'hadron-engine',
    })
    expect(flat.notes.some((note) => note.startsWith('Hadron Engine sets Electric Terrain'))).toBe(
      true,
    )
  })

  it('blocks everything neutral for Wonder Guard', () => {
    expect(
      run({
        attackerSpecies: 'garchomp',
        move: DRAGON_CLAW,
        defenderSpecies: 'shedinja',
        defenderAbility: 'wonder-guard',
      }).immune,
    ).toBe(true)
  })

  it('reads through a Def boost for Unaware', () => {
    const unaware = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      attackerAbility: 'unaware',
      defenseBoost: 2,
    })
    const plain = run({ attackerSpecies: 'garchomp', move: EARTHQUAKE })
    expect(unaware.rolls).toEqual(plain.rolls)
  })

  it('suppresses Levitate for Mold Breaker', () => {
    expect(
      run({
        attackerSpecies: 'garchomp',
        move: EARTHQUAKE,
        attackerAbility: 'mold-breaker',
        defenderSpecies: 'rotom-wash',
        defenderAbility: 'levitate',
      }).immune,
    ).toBe(false)
  })

  /**
   * Mold Breaker reaches the execution of a move, and Intimidate happened on
   * entry. Two calls, one with Mold Breaker and one without, have to land the
   * same stage.
   */
  describe('Mold Breaker and Intimidate', () => {
    const breaking = (ability: string | null) =>
      run({
        attackerSpecies: 'garchomp',
        move: EARTHQUAKE,
        attackerAbility: ability,
        defenderAbility: 'intimidate',
      })

    it('leaves the stage where an ordinary attacker finds it', () => {
      expect(breaking('mold-breaker').rolls).toEqual(breaking(null).rolls)
    })

    it('says Intimidate was applied rather than suppressed', () => {
      expect(
        breaking('mold-breaker').notes.some((note) =>
          note.startsWith('Intimidate was applied as -1 Atk'),
        ),
      ).toBe(true)
    })

    it('claims no suppression it did not do', () => {
      expect(breaking('mold-breaker').notes.some((note) => note.includes('Mold Breaker'))).toBe(
        false,
      )
    })
  })
})

describe('the field', () => {
  it('boosts Water in rain', () => {
    const wet = run({
      attackerSpecies: 'rotom-wash',
      nature: 'modest',
      move: HYDRO_PUMP,
      weather: 'rain',
    })
    const dry = run({ attackerSpecies: 'rotom-wash', nature: 'modest', move: HYDRO_PUMP })
    expect(wet.max).toBeGreaterThan(dry.max)
  })

  it('weakens Water in sun', () => {
    const bright = run({
      attackerSpecies: 'rotom-wash',
      nature: 'modest',
      move: HYDRO_PUMP,
      weather: 'sun',
    })
    const dry = run({ attackerSpecies: 'rotom-wash', nature: 'modest', move: HYDRO_PUMP })
    expect(bright.max).toBeLessThan(dry.max)
  })

  it('boosts a grounded Electric move on Electric Terrain', () => {
    const charged = run({
      attackerSpecies: 'garchomp',
      nature: 'modest',
      move: THUNDERBOLT,
      terrain: 'electric',
    })
    const flat = run({ attackerSpecies: 'garchomp', nature: 'modest', move: THUNDERBOLT })
    expect(charged.basePower).toBeGreaterThan(flat.basePower)
  })

  it('leaves a Flying attacker off the terrain', () => {
    const charged = run({
      attackerSpecies: 'landorus-therian',
      nature: 'modest',
      move: THUNDERBOLT,
      terrain: 'electric',
    })
    const flat = run({ attackerSpecies: 'landorus-therian', nature: 'modest', move: THUNDERBOLT })
    expect(charged.basePower).toBe(flat.basePower)
  })

  it('halves a physical hit through Reflect in singles', () => {
    const screened = run({ attackerSpecies: 'garchomp', move: EARTHQUAKE, reflect: true })
    const open = run({ attackerSpecies: 'garchomp', move: EARTHQUAKE })
    expect(screened.max).toBe(Math.floor(open.max / 2))
  })

  it('softens Reflect in doubles', () => {
    const doubles = run({
      attackerSpecies: 'garchomp',
      move: EARTHQUAKE,
      reflect: true,
      style: 'doubles',
    })
    const singles = run({ attackerSpecies: 'garchomp', move: EARTHQUAKE, reflect: true })
    expect(doubles.max).toBeGreaterThan(singles.max)
  })

  it('ignores Reflect on a critical hit', () => {
    const screened = calculate({
      attacker: newAttacker({
        set: buildSet({ species: 'garchomp', nature: 'adamant', evs: { atk: 252 } }),
        criticalHit: true,
      }),
      defender: newDefender({ set: buildSet({ species: 'dondozo', evs: { hp: 252 } }) }),
      move: EARTHQUAKE,
      field: { ...DEFAULT_FIELD, defenderSide: { ...OPEN_SIDE, reflect: true } },
      dex: fixtureDex,
    })
    const open = run({ attackerSpecies: 'garchomp', move: EARTHQUAKE })
    expect(screened.max).toBeGreaterThan(open.max)
  })
})

describe('move handling', () => {
  it('attacks with Defense for Body Press', () => {
    const press = run({
      attackerSpecies: 'dondozo',
      nature: 'impish',
      attackerEvs: { def: 252 },
      move: BODY_PRESS,
      defenderSpecies: 'chien-pao',
    })
    expect(press.attackStat).toBe(183)
  })

  it('counts three strikes for Surging Strikes', () => {
    expect(
      run({
        attackerSpecies: 'urshifu-rapid-strike',
        move: SURGING_STRIKES,
        defenderSpecies: 'chien-pao',
      }).hits,
    ).toBe(3)
  })

  it('always crits with Surging Strikes', () => {
    expect(
      run({
        attackerSpecies: 'urshifu-rapid-strike',
        move: SURGING_STRIKES,
        defenderSpecies: 'chien-pao',
      }).criticalHit,
    ).toBe(true)
  })

  it('says the critical hit was forced', () => {
    const result = run({
      attackerSpecies: 'urshifu-rapid-strike',
      move: SURGING_STRIKES,
      defenderSpecies: 'chien-pao',
    })
    expect(result.notes).toContain(
      'Surging Strikes always lands a critical hit, so one was applied.',
    )
  })

  it('reads through a Def boost for Sacred Sword', () => {
    const sword = run({
      attackerSpecies: 'urshifu-rapid-strike',
      move: moveId('sacred-sword'),
      defenseBoost: 2,
    })
    const plain = run({ attackerSpecies: 'urshifu-rapid-strike', move: moveId('sacred-sword') })
    expect(sword.rolls).toEqual(plain.rolls)
  })
})

/**
 * Meteor Beam and Electro Shot raise their user's Special Attack while they
 * charge, and neither can deal damage without that having happened — a Power
 * Herb skips the wait, not the boost. So the stage is applied rather than
 * declared out of reach, which is what `@smogon/calc` does and what the games
 * do. It is said on every call, because a stage nobody asked for must not be
 * silent.
 */
describe('the charge boost', () => {
  const beam = () => run({ attackerSpecies: 'glimmora', nature: 'modest', move: METEOR_BEAM })
  const solar = () => run({ attackerSpecies: 'glimmora', nature: 'modest', move: SOLAR_BEAM })

  it('raises the attacking stat', () => {
    expect(beam().attackStat).toBeGreaterThan(solar().attackStat)
  })

  it('raises it by exactly one stage', () => {
    expect(beam().attackStat).toBe(applyBoost(solar().attackStat, 1))
  })

  it('says that it did', () => {
    expect(beam().notes.some((note) => note.includes('+1 SpA'))).toBe(true)
  })

  it('tells the caller not to count the stage twice', () => {
    expect(beam().notes.some((note) => note.includes("attacker's boosts"))).toBe(true)
  })

  it('leaves an ordinary special move alone', () => {
    expect(solar().notes.some((note) => note.includes('+1 SpA'))).toBe(false)
  })
})

/**
 * The abilities that rewrite a stage before it lands on their holder. The
 * stage each one changes is one the calculator applied on its own, so the
 * result has to say what became of it.
 */
describe('the stage rewrites', () => {
  const intimidated = (species: string, ability: string, move: MoveId = EARTHQUAKE) =>
    run({ attackerSpecies: species, move, attackerAbility: ability, defenderAbility: 'intimidate' })

  const unmodelled = (result: DamageResult) =>
    result.notes.filter((note) => note.includes('outside the damage model'))

  it('says Simple doubled Intimidate', () => {
    expect(intimidated('bibarel', 'simple').notes).toContain(
      "Intimidate was applied as -2 Atk rather than -1, because Simple doubles it. Clear it from the attacker's boosts if it is already counted there.",
    )
  })

  it('says Contrary reversed the charge boost', () => {
    expect(
      run({
        attackerSpecies: 'malamar',
        nature: 'modest',
        move: METEOR_BEAM,
        attackerAbility: 'contrary',
      }).notes,
    ).toContain(
      "Meteor Beam was applied as -1 SpA rather than the +1 it gains as it charges, because Contrary reverses it. Clear it from the attacker's boosts if it is already counted there.",
    )
  })

  it('says Defiant answered Intimidate on the stat in use', () => {
    expect(intimidated('kingambit', 'defiant').notes).toContain(
      "Intimidate was applied as -1 Atk and Defiant answered it with +2 Atk. Clear both from the attacker's boosts if they are already counted there.",
    )
  })

  it('says Competitive answered Intimidate on the stat in use', () => {
    expect(intimidated('wigglytuff', 'competitive', MOONBLAST).notes).toContain(
      "Competitive answered Intimidate with +2 SpA, which was applied. Clear it from the attacker's boosts if it is already counted there.",
    )
  })

  it('says what became of a stage Stored Power counts off the attack stat', () => {
    expect(
      run({
        attackerSpecies: 'malamar',
        nature: 'modest',
        move: moveId('stored-power'),
        attackerAbility: 'contrary',
        defenderAbility: 'intimidate',
      }).notes,
    ).toContain(
      "Intimidate was applied as +1 Atk rather than -1, because Contrary reverses it. Clear it from the attacker's boosts if it is already counted there.",
    )
  })

  it('says nothing of a stage the move does not use', () => {
    expect(
      intimidated('kingambit', 'defiant', HYDRO_PUMP).notes.some((note) =>
        note.includes('Intimidate'),
      ),
    ).toBe(false)
  })

  it('says Clear Body blocked Intimidate', () => {
    expect(intimidated('metagross', 'clear-body').notes).toContain(
      'Clear Body blocks Intimidate, so no Atk stage was applied.',
    )
  })

  it('says Inner Focus blocked Intimidate', () => {
    expect(intimidated('dragonite', 'inner-focus').notes).toContain(
      'Inner Focus blocks Intimidate, so no Atk stage was applied.',
    )
  })

  it('says Guard Dog turned Intimidate into a raise', () => {
    expect(intimidated('mabosstiff', 'guard-dog').notes).toContain(
      "Intimidate was applied as +1 Atk rather than -1, because Guard Dog turns it into a raise. Clear it from the attacker's boosts if it is already counted there.",
    )
  })

  it('reports none of the six as outside the model', () => {
    const results = [
      intimidated('bibarel', 'simple'),
      intimidated('malamar', 'contrary'),
      intimidated('kingambit', 'defiant'),
      intimidated('wigglytuff', 'competitive'),
      intimidated('metagross', 'clear-body'),
      intimidated('mabosstiff', 'guard-dog'),
    ]
    expect(results.flatMap(unmodelled)).toEqual([])
  })

  it('still reports an answer to Intimidate the model does not hold', () => {
    expect(intimidated('crawdaunt', 'hyper-cutter').notes).toContain(
      "Crawdaunt's Hyper Cutter is outside the damage model and was not applied.",
    )
  })
})
