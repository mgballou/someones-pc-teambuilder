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

  it('gives Heavy Slam 120 when the user is five times heavier', () => {
    const resolved = resolvePower({
      ...BASE,
      attackerWeightKg: 500,
      defenderWeightKg: 100,
      move: move({ kind: 'weight-ratio' }),
    })
    expect(resolved.kind === 'power' ? resolved.power : -1).toBe(120)
  })

  it('gives Electro Ball 80 at double speed', () => {
    expect(power({ kind: 'speed-ratio' })).toBe(80)
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

  it('reports an unmodelled power rule rather than guessing', () => {
    const resolved = resolvePower({ ...BASE, move: move({ kind: 'other' }) })
    expect(resolved.note).toMatch(/outside the model/)
  })
})
