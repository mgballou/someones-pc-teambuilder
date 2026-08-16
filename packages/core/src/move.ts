import type { MoveId } from './ids'
import type { PokemonType } from './pokemon-type'
import type { BoostableStat } from './stats'

export const MOVE_CATEGORIES = ['physical', 'special', 'status'] as const
export type MoveCategory = (typeof MOVE_CATEGORIES)[number]

/**
 * Who a move can be aimed at. This is what makes a format's `style` matter:
 * in doubles a `all-adjacent-foes` move takes the 0.75 spread reduction and
 * a `selected-target` move does not.
 */
export const MOVE_TARGETS = [
  'selected-target',
  'all-adjacent-foes',
  'all-adjacent',
  'all-foes',
  'user',
  'users-field',
  'opponents-field',
  'entire-field',
  'ally',
  'user-or-ally',
  'random-opponent',
] as const
export type MoveTarget = (typeof MOVE_TARGETS)[number]

/**
 * Move flags that change a calculation or a legality answer. Deliberately not
 * an exhaustive mirror of the games' flag list — every entry here is read by
 * something in this codebase.
 */
export type MoveFlags = {
  readonly contact: boolean
  readonly sound: boolean
  readonly punch: boolean
  readonly bite: boolean
  readonly slicing: boolean
  readonly bullet: boolean
  readonly wind: boolean
  readonly powder: boolean
  readonly pulse: boolean
  readonly bypassSubstitute: boolean
  readonly protectable: boolean
  /** Ignores the target's stat stages, as Chip Away and Sacred Sword do. */
  readonly ignoresDefenseBoosts: boolean
  /** Never misses, which is a different thing from 100 accuracy. */
  readonly alwaysHits: boolean
}

export type MultiHit = {
  readonly min: number
  readonly max: number
}

/** A self-inflicted or target-inflicted stat change, as a fraction of stages. */
export type MoveStatChange = {
  readonly stat: BoostableStat
  readonly stages: number
  readonly target: 'user' | 'target'
  readonly chance: number
}

export type Move = {
  readonly id: MoveId
  readonly name: string
  readonly type: PokemonType
  readonly category: MoveCategory
  /** Zero for status moves and for moves whose power is computed at runtime. */
  readonly basePower: number
  /** `null` means the move cannot miss. Distinct from an accuracy of 100. */
  readonly accuracy: number | null
  readonly pp: number
  readonly priority: number
  readonly target: MoveTarget
  readonly flags: MoveFlags
  /** Stage above the base crit rate. Most moves are 0; Slash-likes are 1. */
  readonly critRatio: number
  readonly multiHit: MultiHit | null
  /** Fraction of damage dealt recovered, as a ratio. Zero when not draining. */
  readonly drain: number
  /** Fraction of damage dealt taken as recoil, as a ratio. */
  readonly recoil: number
  readonly statChanges: readonly MoveStatChange[]
  readonly generation: number
  /** Present when the move's power is not a constant. See `VariablePower`. */
  readonly variablePower: VariablePower | null
  readonly description: string
}

/**
 * Moves whose base power depends on battle state. The calculator needs to know
 * *which* rule applies; encoding it as a tagged union means an unhandled rule
 * fails typecheck rather than silently calculating with base power zero.
 */
export type VariablePower =
  | { readonly kind: 'weight-of-target' }
  | { readonly kind: 'weight-ratio' }
  | { readonly kind: 'speed-ratio' }
  | { readonly kind: 'user-hp-ratio' }
  | { readonly kind: 'target-hp-ratio' }
  | { readonly kind: 'happiness' }
  | { readonly kind: 'consecutive-use' }
  | { readonly kind: 'fixed-damage'; readonly amount: number }
  | { readonly kind: 'level-damage' }
  | { readonly kind: 'ohko' }
  | { readonly kind: 'counter' }
  | { readonly kind: 'other' }

export function isDamaging(move: Move): boolean {
  return move.category !== 'status'
}

/** True when the move hits more than one target and so takes spread reduction. */
export function isSpreadMove(move: Move): boolean {
  return (
    move.target === 'all-adjacent-foes' ||
    move.target === 'all-adjacent' ||
    move.target === 'all-foes'
  )
}
