/**
 * One PokéAPI `move` becomes one `Move`.
 *
 * Three things need care. `accuracy: null` means the move cannot miss and must
 * survive untouched all the way into the dataset — folding it to 100 is the
 * bug that makes a calculator claim Aerial Ace can whiff. `meta` is absent for
 * 110 moves, so drain, recoil, multi-hit and crit come from a curated table
 * where PokéAPI is silent. And PokéAPI's targets are a different sixteen from
 * core's eleven, so the mapping is a total record rather than a lookup with a
 * fallback.
 */

import type {
  Move,
  MoveFlags,
  MoveStatChange,
  MoveTarget,
  MultiHit,
  PokemonType,
  VariablePower,
} from '@spc/core'
import { isPokemonType, moveId } from '@spc/core'
import { IngestError } from '../errors.js'
import type { MoveResponse, PokeApiMoveTarget } from '../pokeapi/schema.js'
import { englishEffect } from '../pokeapi/schema.js'
import {
  BITE_MOVES,
  BULLET_MOVES,
  BYPASS_SUBSTITUTE_MOVES,
  CONTACT_MOVES,
  IGNORES_DEFENSE_BOOSTS_MOVES,
  POWDER_MOVES,
  PULSE_MOVES,
  PUNCH_MOVES,
  SLICING_MOVES,
  SOUND_MOVES,
  UNPROTECTABLE_MOVES,
  WIND_MOVES,
} from './curated/move-flags.js'
import { CURATED_MOVE_META, SELF_STAT_CHANGE_MOVES } from './curated/move-meta.js'
import { CURATED_VARIABLE_POWER } from './curated/move-power.js'
import { boostableStatKey, generationNumber, oneSentence, titleWords } from './text.js'

/**
 * PokéAPI's targets onto core's.
 *
 * A total record, so a target added to the schema without being mapped fails
 * typecheck. The three lossy entries are commented, because losing a spread
 * reduction silently is the expensive kind of wrong.
 */
const TARGETS: Readonly<Record<PokeApiMoveTarget, MoveTarget>> = {
  'specific-move': 'selected-target',
  'selected-pokemon-me-first': 'selected-target',
  ally: 'ally',
  'users-field': 'users-field',
  'user-or-ally': 'user-or-ally',
  'opponents-field': 'opponents-field',
  user: 'user',
  'random-opponent': 'random-opponent',
  'all-other-pokemon': 'all-adjacent',
  'selected-pokemon': 'selected-target',
  /** In doubles every opponent is adjacent, so this takes spread reduction. */
  'all-opponents': 'all-adjacent-foes',
  'entire-field': 'entire-field',
  /** Heal Bell and its kin. Core models a side, not a set of allies. */
  'user-and-allies': 'users-field',
  /** Perish Song, Haze. Nothing damaging uses it, so the reduction is moot. */
  'all-pokemon': 'all-adjacent',
  'all-allies': 'ally',
  'fainting-pokemon': 'selected-target',
}

const FOE_TARGETS: ReadonlySet<MoveTarget> = new Set<MoveTarget>([
  'selected-target',
  'all-adjacent-foes',
  'all-adjacent',
  'all-foes',
  'random-opponent',
])

export function normalizeMove(response: MoveResponse): Move {
  const name = response.name
  const target = TARGETS[response.target.name]
  const category = response.damage_class.name
  const accuracy = response.accuracy
  const curated = CURATED_MOVE_META[name] ?? {}

  if (!isPokemonType(response.type.name)) {
    throw IngestError.unknownType(name, response.type.name)
  }
  const type: PokemonType = response.type.name

  return {
    id: moveId(name),
    name: titleWords(name),
    type,
    category,
    basePower: response.power ?? 0,
    accuracy,
    pp: response.pp ?? 0,
    priority: response.priority,
    target,
    flags: flagsOf({ name, target, accuracy, category }),
    critRatio: response.meta?.crit_rate ?? curated.critRatio ?? 0,
    multiHit: multiHitOf(response) ?? curated.multiHit ?? null,
    drain: drainOf(response) ?? curated.drain ?? 0,
    recoil: recoilOf(response) ?? curated.recoil ?? 0,
    statChanges: statChangesOf(response, target),
    generation: generationNumber(response.generation.name),
    variablePower: variablePowerOf(response),
    description: oneSentence(englishEffect(response.effect_entries)),
  }
}

type FlagsInput = {
  readonly name: string
  readonly target: MoveTarget
  readonly accuracy: number | null
  readonly category: 'physical' | 'special' | 'status'
}

function flagsOf({ name, target, accuracy, category }: FlagsInput): MoveFlags {
  const sound = SOUND_MOVES.has(name)
  const aimedAtFoe = FOE_TARGETS.has(target)
  return {
    contact: CONTACT_MOVES.has(name),
    sound,
    punch: PUNCH_MOVES.has(name),
    bite: BITE_MOVES.has(name),
    slicing: SLICING_MOVES.has(name),
    bullet: BULLET_MOVES.has(name),
    wind: WIND_MOVES.has(name),
    powder: POWDER_MOVES.has(name),
    pulse: PULSE_MOVES.has(name),
    bypassSubstitute: sound || BYPASS_SUBSTITUTE_MOVES.has(name),
    protectable: aimedAtFoe && !UNPROTECTABLE_MOVES.has(name),
    ignoresDefenseBoosts: IGNORES_DEFENSE_BOOSTS_MOVES.has(name),
    /**
     * Derived, not curated. A move with no accuracy that is pointed at a foe
     * cannot miss; a move with no accuracy pointed at its own user — Swords
     * Dance, Protect — was never rolling for accuracy in the first place.
     */
    alwaysHits: accuracy === null && aimedAtFoe && category !== 'status',
  }
}

function multiHitOf(response: MoveResponse): MultiHit | null {
  const min = response.meta?.min_hits
  const max = response.meta?.max_hits
  if (min === null || min === undefined || max === null || max === undefined) return null
  return { min, max }
}

function drainOf(response: MoveResponse): number | null {
  const drain = response.meta?.drain
  if (drain === undefined || drain <= 0) return null
  return drain / 100
}

function recoilOf(response: MoveResponse): number | null {
  const drain = response.meta?.drain
  if (drain === undefined || drain >= 0) return null
  return -drain / 100
}

/**
 * Whose stats move, and how often.
 *
 * PokéAPI's `meta.category` answers the first question and its naming is a
 * trap: `damage-raise` means "the *user's* stats change", even when both
 * changes are negative. Close Combat is `damage-raise` with -1 Def and -1 SpD,
 * and that is right. `damage-lower` means the target's. Where `meta` is
 * missing the move target decides, corrected by a curated list.
 */
function statChangesOf(response: MoveResponse, target: MoveTarget): readonly MoveStatChange[] {
  if (response.stat_changes.length === 0) return []
  const chance = response.effect_chance === null ? 1 : response.effect_chance / 100
  const changeTarget = statChangeTarget(response, target)
  const changes: MoveStatChange[] = []
  for (const entry of response.stat_changes) {
    const stat = boostableStatKey(entry.stat.name)
    if (stat === null) continue
    changes.push({ stat, stages: entry.change, target: changeTarget, chance })
  }
  return changes
}

function statChangeTarget(response: MoveResponse, target: MoveTarget): 'user' | 'target' {
  const category = response.meta?.category.name
  if (category === 'damage-raise') return 'user'
  if (category === 'damage-lower') return 'target'
  if (SELF_STAT_CHANGE_MOVES.has(response.name)) return 'user'
  return target === 'user' || target === 'users-field' ? 'user' : 'target'
}

function variablePowerOf(response: MoveResponse): VariablePower | null {
  const curated = CURATED_VARIABLE_POWER[response.name]
  if (curated !== undefined) return curated
  if (response.damage_class.name === 'status') return null
  return response.power === null ? { kind: 'other' } : null
}
