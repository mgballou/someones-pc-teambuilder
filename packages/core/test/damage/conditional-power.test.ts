import { describe, expect, it } from 'vitest'
import type { BoostSpread, StatSpread } from '../../src/index'
import { moveId, ZERO_BOOSTS } from '../../src/index'
import type { DamageResult, Status, Terrain, Weather } from '../../src/damage/index'
import {
  calculate,
  CONDITIONAL_POWER,
  DEFAULT_FIELD,
  MOVE_OVERRIDES,
  newAttacker,
  newDefender,
} from '../../src/damage/index'
import { fixtureDex } from '../fixtures/dex'
import { buildSet } from './helpers'

type Scenario = {
  readonly attackerSpecies: string
  readonly move: string
  readonly attackerEvs?: Partial<StatSpread>
  readonly attackerItem?: string | null
  readonly attackerAbility?: string | null
  readonly attackerStatus?: Status
  readonly attackerBoosts?: Partial<BoostSpread>
  readonly defenderSpecies?: string
  readonly defenderItem?: string | null
  readonly defenderAbility?: string | null
  readonly defenderStatus?: Status
  readonly defenderHpFraction?: number
  readonly weather?: Weather
  readonly terrain?: Terrain
}

function run({
  attackerSpecies,
  move,
  attackerEvs = { atk: 252, spa: 252 },
  attackerItem = null,
  attackerAbility = null,
  attackerStatus = 'none',
  attackerBoosts = {},
  defenderSpecies = 'blissey',
  defenderItem = null,
  defenderAbility = null,
  defenderStatus = 'none',
  defenderHpFraction = 1,
  weather = 'none',
  terrain = 'none',
}: Scenario): DamageResult {
  return calculate({
    attacker: newAttacker({
      set: buildSet({
        species: attackerSpecies,
        evs: attackerEvs,
        item: attackerItem,
        ability: attackerAbility,
      }),
      boosts: { ...ZERO_BOOSTS, ...attackerBoosts },
      status: attackerStatus,
    }),
    defender: newDefender({
      set: buildSet({
        species: defenderSpecies,
        evs: { hp: 252, def: 252 },
        item: defenderItem,
        ability: defenderAbility,
      }),
      status: defenderStatus,
      hpFraction: defenderHpFraction,
    }),
    move: moveId(move),
    field: { ...DEFAULT_FIELD, weather, terrain },
    dex: fixtureDex,
  })
}

function power(scenario: Scenario): number {
  return run(scenario).basePower
}

describe('a condition the state answers', () => {
  it('reads Knock Off at 97 against a target holding an item', () => {
    expect(
      power({ attackerSpecies: 'kingambit', move: 'knock-off', defenderItem: 'leftovers' }),
    ).toBe(97)
  })

  it('reads Knock Off at its printed 65 against a target holding nothing', () => {
    expect(power({ attackerSpecies: 'kingambit', move: 'knock-off' })).toBe(65)
  })

  it('leaves Knock Off alone against an Ogerpon wearing its mask', () => {
    expect(
      power({
        attackerSpecies: 'kingambit',
        move: 'knock-off',
        defenderSpecies: 'ogerpon-cornerstone-mask',
        defenderItem: 'cornerstone-mask',
      }),
    ).toBe(65)
  })

  it('counts a spent Booster Energy as no item for Acrobatics', () => {
    expect(
      power({
        attackerSpecies: 'flutter-mane',
        move: 'acrobatics',
        attackerAbility: 'protosynthesis',
        attackerItem: 'booster-energy',
      }),
    ).toBe(110)
  })

  it('counts a Booster Energy on a non-Paradox holder as an item for Acrobatics', () => {
    expect(
      power({
        attackerSpecies: 'talonflame',
        move: 'acrobatics',
        attackerAbility: 'flame-body',
        attackerItem: 'booster-energy',
      }),
    ).toBe(55)
  })

  it('doubles Hex against a target with any status', () => {
    expect(
      power({
        attackerSpecies: 'flutter-mane',
        move: 'hex',
        defenderSpecies: 'dondozo',
        defenderStatus: 'paralysis',
      }),
    ).toBe(130)
  })

  it('leaves Hex alone against a clean target', () => {
    expect(
      power({ attackerSpecies: 'flutter-mane', move: 'hex', defenderSpecies: 'dondozo' }),
    ).toBe(65)
  })

  it('doubles Brine against a target at exactly half', () => {
    expect(power({ attackerSpecies: 'pelipper', move: 'brine', defenderHpFraction: 0.5 })).toBe(130)
  })

  it('leaves Brine alone one point above half', () => {
    expect(power({ attackerSpecies: 'pelipper', move: 'brine', defenderHpFraction: 0.51 })).toBe(65)
  })

  it('turns Weather Ball into the weather overhead', () => {
    expect(
      run({ attackerSpecies: 'charizard', move: 'weather-ball', weather: 'sand' }).basePower,
    ).toBe(100)
  })

  it('leaves Weather Ball Normal under clear skies', () => {
    expect(run({ attackerSpecies: 'charizard', move: 'weather-ball' }).effectiveness).toBe(1)
  })

  it('withholds Terrain Pulse from a user that is not on the ground', () => {
    expect(
      power({ attackerSpecies: 'talonflame', move: 'terrain-pulse', terrain: 'electric' }),
    ).toBe(50)
  })

  it('doubles Rising Voltage against a target standing on the terrain', () => {
    expect(
      power({ attackerSpecies: 'raging-bolt', move: 'rising-voltage', terrain: 'electric' }),
    ).toBe(182)
  })

  it('withholds the doubling from a target that is not on the ground', () => {
    expect(
      power({
        attackerSpecies: 'raging-bolt',
        move: 'rising-voltage',
        defenderSpecies: 'talonflame',
        terrain: 'electric',
      }),
    ).toBe(91)
  })

  it('counts only raised stages for Stored Power', () => {
    expect(
      power({
        attackerSpecies: 'flutter-mane',
        move: 'stored-power',
        attackerBoosts: { spa: 3, def: -2 },
      }),
    ).toBe(80)
  })

  it('halves Solar Beam under snow', () => {
    expect(power({ attackerSpecies: 'venusaur', move: 'solar-beam', weather: 'snow' })).toBe(60)
  })

  it('leaves Solar Beam whole under sun', () => {
    expect(power({ attackerSpecies: 'venusaur', move: 'solar-beam', weather: 'sun' })).toBe(120)
  })

  it('says nothing when the state answered the condition', () => {
    expect(run({ attackerSpecies: 'pelipper', move: 'brine' }).notes).toEqual([])
  })
})

describe('a condition the state cannot answer', () => {
  it('names turn order on Payback', () => {
    expect(run({ attackerSpecies: 'kingambit', move: 'payback' }).notes[0]).toContain(
      'Turn order was guessed by comparing Speed',
    )
  })

  it('names turn order on Bolt Beak', () => {
    expect(run({ attackerSpecies: 'dracozolt', move: 'bolt-beak' }).notes[0]).toContain(
      'Turn order was guessed by comparing Speed',
    )
  })

  it('names the rule it could not check on Assurance', () => {
    expect(run({ attackerSpecies: 'kingambit', move: 'assurance' }).notes[0]).toContain(
      'doubles if the target has already taken damage this turn',
    )
  })

  it('leaves Assurance at its printed power while saying so', () => {
    expect(power({ attackerSpecies: 'kingambit', move: 'assurance' })).toBe(60)
  })

  it('explains the hits it summed for Triple Axel', () => {
    expect(run({ attackerSpecies: 'cloyster', move: 'triple-axel' }).notes).toContain(
      "Triple Axel's hits are 20, 40 and 60 base power. The rolls are their sum; the base power shown is the first hit's.",
    )
  })
})

/**
 * The guard.
 *
 * The bug this table exists to close was an entry that looked complete and was
 * not, so a table that quietly loses an entry recreates it. Both halves below
 * are checkable: the first against `@smogon/calc`'s own list of moves whose
 * power is decided at run time, the second against the shape every entry has
 * to have to be worth anything.
 */

/**
 * Every move `@smogon/calc` 0.11.0 special-cases in `calculateBasePowerSMSSSV`
 * and `calculateBPModsSMSSSV`, restricted to the ones Generation 9 has and to
 * the ones whose printed power is not already answered by `variablePower`.
 * Transcribed from `dist/mechanics/gen789.js`.
 */
const REFERENCE_CONDITIONAL_MOVES: readonly string[] = [
  'acrobatics',
  'assurance',
  'barb-barrage',
  'bolt-beak',
  'brine',
  'collision-course',
  'electro-drift',
  'expanding-force',
  'facade',
  'fishious-rend',
  'grav-apple',
  'hex',
  'infernal-parade',
  'knock-off',
  'lash-out',
  'misty-explosion',
  'payback',
  'power-trip',
  'psyblade',
  'pursuit',
  'rising-voltage',
  'smelling-salts',
  'solar-beam',
  'solar-blade',
  'stored-power',
  'terrain-pulse',
  'triple-axel',
  'triple-kick',
  'venoshock',
  'wake-up-slap',
  'weather-ball',
]

describe('the table itself', () => {
  it.each(REFERENCE_CONDITIONAL_MOVES)('holds an entry for %s', (id) => {
    expect(CONDITIONAL_POWER[id]).toBeDefined()
  })

  it('gives Weather Ball a type rule to go with its power rule', () => {
    expect(MOVE_OVERRIDES['weather-ball']?.typeFromField).toBeDefined()
  })

  it('gives Terrain Pulse a type rule to go with its power rule', () => {
    expect(MOVE_OVERRIDES['terrain-pulse']?.typeFromField).toBeDefined()
  })
})
