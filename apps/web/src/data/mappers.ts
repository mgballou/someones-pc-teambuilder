import type { PokemonSet, SetId, Team, TeamId } from '@spc/core'
import { abilityId, EMPTY_EVS, formatId, itemId, PERFECT_IVS, speciesId } from '@spc/core'
import type { PokemonSetRow, TeamRow } from '../db/schema.js'

/**
 * The row/domain boundary.
 *
 * Rows are wide and nullable because Postgres is; the domain is narrow and
 * total because the rest of the app should not have to think about it. Every
 * conversion happens here and nowhere else.
 */

export function toDomainSet(row: PokemonSetRow): PokemonSet {
  return {
    id: row.id as SetId,
    species: speciesId(row.species),
    nickname: row.nickname,
    level: row.level,
    gender: row.gender,
    shiny: row.shiny,
    ability: row.ability === null ? null : abilityId(row.ability),
    item: row.item === null ? null : itemId(row.item),
    nature: row.nature,
    evs: row.evs ?? EMPTY_EVS,
    ivs: row.ivs ?? PERFECT_IVS,
    moves: row.moves,
    teraType: row.teraType,
    gigantamax: row.gigantamax,
    notes: row.notes,
  }
}

export type SetInsert = {
  readonly userId: string
  readonly teamId: string | null
  readonly position: number | null
  readonly set: PokemonSet
}

export function toRowValues({ userId, teamId, position, set }: SetInsert) {
  return {
    id: set.id,
    userId,
    teamId,
    position,
    species: set.species,
    nickname: set.nickname,
    level: set.level,
    gender: set.gender,
    shiny: set.shiny,
    ability: set.ability,
    item: set.item,
    nature: set.nature,
    teraType: set.teraType,
    gigantamax: set.gigantamax,
    notes: set.notes,
    evs: set.evs,
    ivs: set.ivs,
    moves: set.moves,
  }
}

export type TeamWithMembers = {
  readonly team: TeamRow
  readonly members: readonly PokemonSetRow[]
}

export function toDomainTeam({ team, members }: TeamWithMembers): Team {
  const ordered = [...members].sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
  return {
    id: team.id as TeamId,
    name: team.name,
    format: formatId(team.formatId),
    members: ordered.map(toDomainSet),
    notes: team.notes,
    tags: team.tags,
  }
}
