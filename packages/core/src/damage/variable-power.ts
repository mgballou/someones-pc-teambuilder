import type { Move } from '../move'
import { ImpossibleState } from './errors'

/**
 * What a variable-power rule resolved to.
 *
 * `exact` exists because Seismic Toss, Sonic Boom and the OHKO moves never
 * enter the damage formula at all — returning a base power for them would be
 * a lie the rest of the chain would then multiply.
 */
export type ResolvedPower =
  | { readonly kind: 'power'; readonly power: number; readonly note: string | null }
  | { readonly kind: 'exact'; readonly damage: number; readonly note: string | null }

export type ResolvePowerInput = {
  readonly move: Move
  readonly attackerWeightKg: number
  readonly defenderWeightKg: number
  readonly attackerSpeed: number
  readonly defenderSpeed: number
  readonly attackerHpFraction: number
  readonly defenderHpFraction: number
  readonly attackerLevel: number
  readonly defenderCurrentHp: number
}

/** Low Kick and Grass Knot, by the target's weight in kilograms. */
function powerByTargetWeight(weightKg: number): number {
  if (weightKg >= 200) return 120
  if (weightKg >= 100) return 100
  if (weightKg >= 50) return 80
  if (weightKg >= 25) return 60
  if (weightKg >= 10) return 40
  return 20
}

/** Heavy Slam and Heat Crash, by how many times heavier the user is. */
function powerByWeightRatio(attackerWeightKg: number, defenderWeightKg: number): number {
  if (defenderWeightKg <= 0) return 120
  const ratio = attackerWeightKg / defenderWeightKg
  if (ratio >= 5) return 120
  if (ratio >= 4) return 100
  if (ratio >= 3) return 80
  if (ratio >= 2) return 60
  return 40
}

/** Electro Ball, by how many times faster the user is. */
function powerBySpeedRatio(attackerSpeed: number, defenderSpeed: number): number {
  if (defenderSpeed <= 0) return 150
  const ratio = attackerSpeed / defenderSpeed
  if (ratio >= 4) return 150
  if (ratio >= 3) return 120
  if (ratio >= 2) return 80
  if (ratio > 1) return 60
  return 40
}

export function resolvePower({
  move,
  attackerWeightKg,
  defenderWeightKg,
  attackerSpeed,
  defenderSpeed,
  attackerHpFraction,
  defenderHpFraction,
  attackerLevel,
  defenderCurrentHp,
}: ResolvePowerInput): ResolvedPower {
  const rule = move.variablePower
  /**
   * No rule here means the dataset printed a power, and nothing more. It does
   * *not* mean the power is a constant — Knock Off and Facade print one and
   * change it in battle. Whether the printed number is the whole story is
   * `conditional-power.ts`'s question, and the caller asks it next.
   */
  if (rule === null) return { kind: 'power', power: move.basePower, note: null }

  switch (rule.kind) {
    case 'weight-of-target':
      return { kind: 'power', power: powerByTargetWeight(defenderWeightKg), note: null }
    case 'weight-ratio':
      return {
        kind: 'power',
        power: powerByWeightRatio(attackerWeightKg, defenderWeightKg),
        note: null,
      }
    case 'speed-ratio':
      return {
        kind: 'power',
        power: powerBySpeedRatio(attackerSpeed, defenderSpeed),
        note: `${move.name}'s power was computed the way Electro Ball's is. Gyro Ball's inverse rule is not distinguished in the dataset.`,
      }
    case 'user-hp-ratio':
      return { kind: 'power', power: Math.max(1, Math.floor(150 * attackerHpFraction)), note: null }
    case 'target-hp-ratio':
      return {
        kind: 'power',
        power: Math.max(1, Math.floor(120 * defenderHpFraction)),
        note: null,
      }
    case 'fixed-damage':
      return { kind: 'exact', damage: rule.amount, note: null }
    case 'level-damage':
      return { kind: 'exact', damage: attackerLevel, note: null }
    case 'ohko':
      return {
        kind: 'exact',
        damage: defenderCurrentHp,
        note: `${move.name} is a one-hit knockout move. Accuracy and the level rule that blocks it are not modelled.`,
      }
    case 'happiness':
      return {
        kind: 'power',
        power: Math.max(1, move.basePower),
        note: `${move.name}'s power depends on friendship, which this app does not track. The dataset's base power was used.`,
      }
    case 'consecutive-use':
      return {
        kind: 'power',
        power: Math.max(1, move.basePower),
        note: `${move.name}'s power depends on how many turns it has been used for. The first turn's power was used.`,
      }
    case 'counter':
      return {
        kind: 'power',
        power: Math.max(1, move.basePower),
        note: `${move.name} returns damage it has taken. That is not modelled; the dataset's base power was used.`,
      }
    case 'other':
      return {
        kind: 'power',
        power: Math.max(1, move.basePower),
        note: `${move.name} has a power rule outside the model. The dataset's base power was used.`,
      }
    default:
      throw ImpossibleState.unreachable(rule)
  }
}
