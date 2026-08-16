/**
 * Type coverage, offensive and defensive.
 *
 * Offence reads the team's actual damaging moves — not its typing — because a
 * Fire type with no Fire move covers nothing. Defence reads the six-by-eighteen
 * grid and ranks the weaknesses more than one member shares, which is the
 * "four of your six take double from Ground" check this panel exists for.
 *
 * Two limits, stated rather than hidden:
 *
 * - Terastallizing changes what a move gets STAB from, not what type the move
 *   is, so `stab` accounts for the Tera type and the multiplier does not. Moves
 *   whose type is decided at run time, Tera Blast among them, are read at their
 *   printed type.
 * - The defensive grid uses each member's printed typing. Terastallizing rewrites
 *   it, but only once per battle and only for one member, so a grid that assumed
 *   it would be lying about the other five.
 */

import type { Dex } from '../dex'
import type { MoveId, SetId, SpeciesId } from '../ids'
import { isDamaging } from '../move'
import type { PokemonType } from '../pokemon-type'
import {
  effectivenessAgainst,
  effectivenessOf,
  isPokemonType,
  POKEMON_TYPES,
} from '../pokemon-type'
import type { PokemonSet } from '../set'
import { filledMoves } from '../set'
import type { Team } from '../team'

/** A reading per attacking type. Eighteen entries, always all eighteen. */
export type TypeTable<T> = Readonly<Record<PokemonType, T>>

/* --------------------------------------------------------------- offensive */

/** One damaging move on the team, measured against one defending type. */
export type OffensiveHit = {
  readonly setId: SetId
  readonly species: SpeciesId
  readonly move: MoveId
  readonly moveType: PokemonType
  readonly multiplier: number
  /** True when the mover gets STAB, counting its Tera type if it has one. */
  readonly stab: boolean
}

export type OffensiveMatchup = {
  readonly defending: PokemonType
  /** Highest multiplier anything on the team reaches against this type. */
  readonly best: number
  /** Every hit that reaches `best`, so the interface can name the mover. */
  readonly bestHits: readonly OffensiveHit[]
}

export type OffensiveCoverage = {
  readonly byType: TypeTable<OffensiveMatchup>
  /** Types something on the team hits for more than 1x. */
  readonly superEffective: readonly PokemonType[]
  /** Types nothing on the team hits for more than 1x. The gap list. */
  readonly uncovered: readonly PokemonType[]
  /** Damaging move types the team carries, in chart order. */
  readonly attackingTypes: readonly PokemonType[]
  /** True when no member carries a damaging move at all. */
  readonly unarmed: boolean
}

/* --------------------------------------------------------------- defensive */

export type MemberDefense = {
  readonly setId: SetId
  readonly species: SpeciesId
  readonly types: readonly PokemonType[]
  readonly takes: TypeTable<number>
}

export type SharedWeakness = {
  readonly type: PokemonType
  /** Members taking 2x or more, by set id. */
  readonly members: readonly SetId[]
  readonly count: number
}

export type DefensiveCoverage = {
  readonly grid: readonly MemberDefense[]
  /** Weaknesses two or more members share, most-shared first. */
  readonly sharedWeaknesses: readonly SharedWeakness[]
  /** Types no member resists or is immune to. */
  readonly unresisted: readonly PokemonType[]
}

/* ------------------------------------------------------------------- notes */

/**
 * Something the report could not account for. Named rather than dropped — a
 * coverage panel that quietly ignores a move is worse than one that says it
 * could not read it.
 */
export type CoverageNote =
  | { readonly kind: 'unknown-move'; readonly setId: SetId; readonly move: MoveId }
  | { readonly kind: 'unknown-species'; readonly setId: SetId; readonly species: SpeciesId }

export type CoverageReport = {
  readonly offensive: OffensiveCoverage
  readonly defensive: DefensiveCoverage
  readonly notes: readonly CoverageNote[]
}

export type AnalyzeCoverageInput = {
  readonly team: Team
  readonly dex: Dex
}

export function analyzeCoverage({ team, dex }: AnalyzeCoverageInput): CoverageReport {
  const notes: CoverageNote[] = []
  const hits = collectHits({ team, dex, notes })
  const grid = buildGrid({ team, dex, notes })

  return {
    offensive: buildOffensive(hits),
    defensive: buildDefensive(grid),
    notes,
  }
}

/* ------------------------------------------------------------ the offensive */

type LoadedMove = {
  readonly setId: SetId
  readonly species: SpeciesId
  readonly move: MoveId
  readonly moveType: PokemonType
  readonly stab: boolean
}

function collectHits({
  team,
  dex,
  notes,
}: {
  readonly team: Team
  readonly dex: Dex
  readonly notes: CoverageNote[]
}): readonly LoadedMove[] {
  const loaded: LoadedMove[] = []

  for (const set of team.members) {
    const species = dex.species(set.species)
    const stabTypes = species === undefined ? stabTypesOf(set, []) : stabTypesOf(set, species.types)

    for (const id of filledMoves(set)) {
      const move = dex.move(id)
      if (move === undefined) {
        notes.push({ kind: 'unknown-move', setId: set.id, move: id })
        continue
      }
      if (!isDamaging(move)) continue
      loaded.push({
        setId: set.id,
        species: set.species,
        move: move.id,
        moveType: move.type,
        stab: stabTypes.includes(move.type),
      })
    }
  }

  return loaded
}

/**
 * The types a set gets STAB from: its printed typing, plus its Tera type.
 *
 * Terastallizing into a type the species already has keeps the original STAB
 * rather than replacing it, so the union is right. A Stellar Tera type is not a
 * defensive or offensive type and adds nothing here.
 */
function stabTypesOf(set: PokemonSet, printed: readonly PokemonType[]): readonly PokemonType[] {
  if (set.teraType === null || !isPokemonType(set.teraType)) return printed
  return printed.includes(set.teraType) ? printed : [...printed, set.teraType]
}

function buildOffensive(hits: readonly LoadedMove[]): OffensiveCoverage {
  const byType = tableOf<OffensiveMatchup>((defending) => {
    const scored = hits.map((hit) => ({
      setId: hit.setId,
      species: hit.species,
      move: hit.move,
      moveType: hit.moveType,
      stab: hit.stab,
      multiplier: effectivenessOf(hit.moveType, defending),
    }))
    const best = scored.reduce((highest, hit) => Math.max(highest, hit.multiplier), 0)
    return {
      defending,
      best,
      bestHits: scored.filter((hit) => hit.multiplier === best),
    }
  })

  const attackingTypes = POKEMON_TYPES.filter((type) => hits.some((hit) => hit.moveType === type))

  return {
    byType,
    superEffective: POKEMON_TYPES.filter((type) => byType[type].best > 1),
    uncovered: POKEMON_TYPES.filter((type) => byType[type].best <= 1),
    attackingTypes,
    unarmed: hits.length === 0,
  }
}

/* ------------------------------------------------------------ the defensive */

function buildGrid({
  team,
  dex,
  notes,
}: {
  readonly team: Team
  readonly dex: Dex
  readonly notes: CoverageNote[]
}): readonly MemberDefense[] {
  const grid: MemberDefense[] = []

  for (const set of team.members) {
    const species = dex.species(set.species)
    if (species === undefined) {
      notes.push({ kind: 'unknown-species', setId: set.id, species: set.species })
      continue
    }
    grid.push({
      setId: set.id,
      species: species.id,
      types: species.types,
      takes: tableOf((attacking) => effectivenessAgainst(attacking, species.types)),
    })
  }

  return grid
}

function buildDefensive(grid: readonly MemberDefense[]): DefensiveCoverage {
  const sharedWeaknesses = POKEMON_TYPES.map((type) => {
    const members = grid.filter((member) => member.takes[type] >= 2).map((member) => member.setId)
    return { type, members, count: members.length }
  })
    .filter((weakness) => weakness.count >= 2)
    .sort(
      (a, b) => b.count - a.count || POKEMON_TYPES.indexOf(a.type) - POKEMON_TYPES.indexOf(b.type),
    )

  const unresisted = POKEMON_TYPES.filter((type) => !grid.some((member) => member.takes[type] < 1))

  return { grid, sharedWeaknesses, unresisted }
}

/* ------------------------------------------------------------------ tables */

function tableOf<T>(compute: (type: PokemonType) => T): TypeTable<T> {
  // `Object.fromEntries` cannot keep the key union and no type guard recovers
  // it. The keys come from `POKEMON_TYPES` itself, so the shape is sound.
  return Object.fromEntries(POKEMON_TYPES.map((type) => [type, compute(type)])) as TypeTable<T>
}
