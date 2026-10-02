import { describe, expect, it } from 'vitest'
import type { Move, VariablePower } from '../../src/index'
import { moveId } from '../../src/index'
import { resolvePower } from '../../src/damage/index'

function move(rule: VariablePower | null, basePower = 60): Move {
  return {
    id: moveId('test-move'),
    name: 'Test Move',
    type: 'normal',
    category: 'physical',
    basePower,
    accuracy: 100,
    pp: 10,
    priority: 0,
    target: 'selected-target',
    flags: {
      contact: false,
      sound: false,
      punch: false,
      bite: false,
      slicing: false,
      bullet: false,
      wind: false,
      powder: false,
      pulse: false,
      bypassSubstitute: false,
      protectable: true,
      ignoresDefenseBoosts: false,
      alwaysHits: false,
    },
    critRatio: 0,
    multiHit: null,
    drain: 0,
    recoil: 0,
    statChanges: [],
    raisesEvasion: false,
    generation: 9,
    variablePower: rule,
    description: '',
  }
}

const BASE = {
  attackerWeightKg: 95,
  defenderWeightKg: 0.3,
  attackerSpeed: 200,
  defenderSpeed: 100,
  attackerHpFraction: 1,
  defenderHpFraction: 1,
  attackerLevel: 50,
  defenderCurrentHp: 157,
}

function power(rule: VariablePower | null, basePower?: number): number {
  const resolved = resolvePower({ ...BASE, move: move(rule, basePower) })
  return resolved.kind === 'power' ? resolved.power : -1
}

describe('resolvePower', () => {
  it('passes a constant base power through', () => {
    expect(power(null, 100)).toBe(100)
  })

  it('gives Grass Knot 20 against a featherweight', () => {
    expect(power({ kind: 'weight-of-target' })).toBe(20)
  })

  it('gives Low Kick 120 against a 220kg target', () => {
    const resolved = resolvePower({
      ...BASE,
      defenderWeightKg: 220,
      move: move({ kind: 'weight-of-target' }),
    })
    expect(resolved.kind === 'power' ? resolved.power : -1).toBe(120)
  })

  it.each([
    [9.9, 20],
    [10, 40],
    [24.9, 40],
    [25, 60],
    [49.9, 60],
    [50, 80],
    [99.9, 80],
    [100, 100],
    [199.9, 100],
    [200, 120],
  ])('gives Low Kick at %skg target weight a power of %s', (weight, expected) => {
    const resolved = resolvePower({
      ...BASE,
      defenderWeightKg: weight,
      move: move({ kind: 'weight-of-target' }),
    })

    expect(resolved).toEqual({ kind: 'power', power: expected, note: null })
  })

  it('gives Heavy Slam 120 when the user is five times heavier', () => {
    const resolved = resolvePower({
      ...BASE,
      attackerWeightKg: 500,
      defenderWeightKg: 100,
      move: move({ kind: 'weight-ratio' }),
    })
    expect(resolved.kind === 'power' ? resolved.power : -1).toBe(120)
  })

  it.each([
    [500, 100, 120],
    [400, 100, 100],
    [300, 100, 80],
    [200, 100, 60],
    [199, 100, 40],
    [10, 0, 120],
  ])('gives Heavy Slam at %skg against %skg a power of %s', (attacker, defender, expected) => {
    const resolved = resolvePower({
      ...BASE,
      attackerWeightKg: attacker,
      defenderWeightKg: defender,
      move: move({ kind: 'weight-ratio' }),
    })

    expect(resolved).toEqual({ kind: 'power', power: expected, note: null })
  })

  it('gives Electro Ball 80 at double speed', () => {
    expect(power({ kind: 'speed-ratio' })).toBe(80)
  })

  it.each([
    [400, 100, 150],
    [300, 100, 120],
    [200, 100, 80],
    [150, 100, 60],
    [100, 100, 40],
    [100, 0, 150],
  ])('gives Electro Ball at speed %s against %s a power of %s', (attacker, defender, expected) => {
    const resolved = resolvePower({
      ...BASE,
      attackerSpeed: attacker,
      defenderSpeed: defender,
      move: move({ kind: 'speed-ratio' }),
    })

    expect(resolved.kind === 'power' ? resolved.power : -1).toBe(expected)
  })

  it('names the Gyro Ball assumption in a note', () => {
    const resolved = resolvePower({ ...BASE, move: move({ kind: 'speed-ratio' }) })
    expect(resolved.note).toMatch(/Gyro Ball/)
  })

  it('gives Eruption 150 at full HP', () => {
    expect(power({ kind: 'user-hp-ratio' })).toBe(150)
  })

  it('gives Eruption 75 at half HP', () => {
    const resolved = resolvePower({
      ...BASE,
      attackerHpFraction: 0.5,
      move: move({ kind: 'user-hp-ratio' }),
    })
    expect(resolved.kind === 'power' ? resolved.power : -1).toBe(75)
  })

  it('never drops a variable power below one', () => {
    const resolved = resolvePower({
      ...BASE,
      attackerHpFraction: 0,
      move: move({ kind: 'user-hp-ratio' }),
    })
    expect(resolved.kind === 'power' ? resolved.power : -1).toBe(1)
  })

  it('scales Crush Grip down with the target HP fraction', () => {
    const resolved = resolvePower({
      ...BASE,
      defenderHpFraction: 0.5,
      move: move({ kind: 'target-hp-ratio' }),
    })

    expect(resolved).toEqual({ kind: 'power', power: 60, note: null })
  })

  it('keeps HP-based power at one when the target has no HP left', () => {
    const resolved = resolvePower({
      ...BASE,
      defenderHpFraction: 0,
      move: move({ kind: 'target-hp-ratio' }),
    })

    expect(resolved).toEqual({ kind: 'power', power: 1, note: null })
  })

  it('returns Seismic Toss as exact damage', () => {
    const resolved = resolvePower({ ...BASE, move: move({ kind: 'level-damage' }) })
    expect(resolved.kind === 'exact' ? resolved.damage : -1).toBe(50)
  })

  it('returns Sonic Boom as exact damage', () => {
    const resolved = resolvePower({
      ...BASE,
      move: move({ kind: 'fixed-damage', amount: 20 }),
    })
    expect(resolved.kind === 'exact' ? resolved.damage : -1).toBe(20)
  })

  it('returns the defender current HP for a one-hit knockout move', () => {
    const resolved = resolvePower({ ...BASE, move: move({ kind: 'ohko' }) })

    expect(resolved).toEqual({
      kind: 'exact',
      damage: BASE.defenderCurrentHp,
      note: expect.stringContaining('one-hit knockout move'),
    })
  })

  it.each([
    ['happiness', 'friendship'],
    ['consecutive-use', 'how many turns'],
    ['counter', 'returns damage'],
  ] as const)('explains the %s power assumption', (kind, explanation) => {
    const resolved = resolvePower({ ...BASE, move: move({ kind }, 0) })

    expect(resolved).toEqual({
      kind: 'power',
      power: 1,
      note: expect.stringContaining(explanation),
    })
  })

  it('reports an unmodelled power rule rather than guessing', () => {
    const resolved = resolvePower({ ...BASE, move: move({ kind: 'other' }) })
    expect(resolved.note).toMatch(/outside the model/)
  })
})
