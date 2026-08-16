import type { BattleStyle } from '../format.js'
import type { AbilityId } from '../ids.js'
import type { Item } from '../item.js'
import type { Move, MoveCategory } from '../move.js'
import type { PokemonType, TeraType } from '../pokemon-type.js'
import type { PokemonSet } from '../set.js'
import type { Species } from '../species.js'
import type { BoostableStat, BoostSpread, StatSpread } from '../stats.js'
import { ZERO_BOOSTS } from '../stats.js'

export const WEATHERS = ['none', 'sun', 'rain', 'sand', 'snow'] as const
export type Weather = (typeof WEATHERS)[number]

export const TERRAINS = ['none', 'electric', 'grassy', 'psychic', 'misty'] as const
export type Terrain = (typeof TERRAINS)[number]

export const STATUSES = [
  'none',
  'burn',
  'poison',
  'badly-poisoned',
  'paralysis',
  'sleep',
  'freeze',
] as const
export type Status = (typeof STATUSES)[number]

/** What one side of the field has standing. Screens are the damage-relevant part. */
export type Side = {
  readonly reflect: boolean
  readonly lightScreen: boolean
  readonly auroraVeil: boolean
  readonly helpingHand: boolean
  readonly friendGuard: boolean
}

export const OPEN_SIDE: Side = {
  reflect: false,
  lightScreen: false,
  auroraVeil: false,
  helpingHand: false,
  friendGuard: false,
}

export type Field = {
  readonly weather: Weather
  readonly terrain: Terrain
  /** Doubles changes the screen modifier and is what makes spread hits possible. */
  readonly style: BattleStyle
  readonly attackerSide: Side
  readonly defenderSide: Side
}

export const DEFAULT_FIELD: Field = {
  weather: 'none',
  terrain: 'none',
  style: 'singles',
  attackerSide: OPEN_SIDE,
  defenderSide: OPEN_SIDE,
}

/**
 * A built set plus the state it is in right now. The set is the durable thing;
 * everything else here changes turn to turn and so is never written back onto
 * a `PokemonSet`.
 */
export type Combatant = {
  readonly set: PokemonSet
  readonly boosts: BoostSpread
  /** Remaining HP as a fraction of maximum, 0 to 1. */
  readonly hpFraction: number
  readonly status: Status
  readonly terastallized: boolean
}

export type Attacker = Combatant & {
  /** How many Pokémon this hit lands on. Above one takes the spread reduction. */
  readonly targets: number
  readonly criticalHit: boolean
}

export type Defender = Combatant

export type CombatantInput = {
  readonly set: PokemonSet
  readonly boosts?: BoostSpread
  readonly hpFraction?: number
  readonly status?: Status
  readonly terastallized?: boolean
}

export type AttackerInput = CombatantInput & {
  readonly targets?: number
  readonly criticalHit?: boolean
}

export function newAttacker({
  set,
  boosts = ZERO_BOOSTS,
  hpFraction = 1,
  status = 'none',
  terastallized = false,
  targets = 1,
  criticalHit = false,
}: AttackerInput): Attacker {
  return { set, boosts, hpFraction, status, terastallized, targets, criticalHit }
}

export function newDefender({
  set,
  boosts = ZERO_BOOSTS,
  hpFraction = 1,
  status = 'none',
  terastallized = false,
}: CombatantInput): Defender {
  return { set, boosts, hpFraction, status, terastallized }
}

/**
 * One side as the registries see it: resolved records rather than ids, so a
 * hook never needs the dex and can never make a second lookup disagree with
 * the first.
 */
export type SideView = {
  readonly set: PokemonSet
  readonly species: Species
  /** Stats at level, before boosts and before any modifier. */
  readonly stats: StatSpread
  readonly boosts: BoostSpread
  readonly hpFraction: number
  readonly status: Status
  readonly terastallized: boolean
  readonly ability: AbilityId | null
  readonly item: Item | null
  /** Typing as it stands, which is the Tera type when Terastallized. */
  readonly types: readonly PokemonType[]
  readonly originalTypes: readonly PokemonType[]
  readonly grounded: boolean
}

/** Everything a registry hook may read. Hooks return modifiers; they never mutate. */
export type ModifierContext = {
  readonly move: Move
  /** The type the move is actually dealing, after Tera Blast and friends. */
  readonly moveType: TeraType
  readonly category: Exclude<MoveCategory, 'status'>
  /** Which stat is attacking. Usually Atk or SpA; Body Press attacks with Def. */
  readonly attackStatName: BoostableStat
  readonly defenseStatName: BoostableStat
  /** Base power after the variable-power rule, before the base-power chain. */
  readonly basePower: number
  readonly effectiveness: number
  readonly attacker: SideView
  readonly defender: SideView
  readonly field: Field
  readonly criticalHit: boolean
  readonly targets: number
}

export type DamagePercent = {
  readonly min: number
  readonly max: number
}

/**
 * How many hits this takes to knock the target out.
 *
 * A union rather than a number because "2HKO" and "2HKO on eleven of sixteen
 * rolls" are different claims and a competitive player reads them differently.
 */
export type KoChance =
  | { readonly kind: 'none'; readonly summary: string }
  | { readonly kind: 'guaranteed'; readonly hits: number; readonly summary: string }
  | {
      readonly kind: 'chance'
      /** Hits needed on the highest roll. */
      readonly hits: number
      /** How many of the sixteen rolls get there in `hits`. */
      readonly rolls: number
      /** Hits needed on the lowest roll. */
      readonly worstCaseHits: number
      readonly summary: string
    }

export type DamageResult = {
  /** All sixteen rolls, ascending. Multi-hit rolls are the sum across hits. */
  readonly rolls: readonly number[]
  readonly min: number
  readonly max: number
  readonly percent: DamagePercent
  readonly defenderMaxHp: number
  readonly defenderCurrentHp: number
  readonly effectiveness: number
  /** STAB as a plain ratio — 1, 1.5, 2, 2.25 or Stellar's 1.2. */
  readonly stab: number
  readonly basePower: number
  readonly attackStat: number
  readonly defenseStat: number
  readonly hits: number
  readonly criticalHit: boolean
  readonly immune: boolean
  readonly ko: KoChance
  /**
   * Everything the model did not account for, named. Required by the honesty
   * rules: a calculator that silently ignores an ability is worse than one
   * that says it cannot model it.
   */
  readonly notes: readonly string[]
}
