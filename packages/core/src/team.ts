import type { FormatId, SetId, TeamId } from './ids.js'
import type { PokemonSet } from './set.js'
import { cloneSet } from './set.js'

/**
 * A team is an ordered arrangement of sets under one format.
 *
 * Sets are embedded rather than referenced. A team is the unit a person
 * shares, exports and reasons about, and a team whose members can change
 * underneath it because another team edited a shared set is a bug, not a
 * feature. The Box (see `box.ts`) is where reuse lives, and it copies on the
 * way in and out.
 */
export type Team = {
  readonly id: TeamId
  readonly name: string
  readonly format: FormatId
  readonly members: readonly PokemonSet[]
  readonly notes: string
  readonly tags: readonly string[]
}

export type NewTeamInput = {
  readonly id: TeamId
  readonly name: string
  readonly format: FormatId
}

export function newTeam({ id, name, format }: NewTeamInput): Team {
  return { id, name, format, members: [], notes: '', tags: [] }
}

export function memberCount(team: Team): number {
  return team.members.length
}

export function findMember(team: Team, setId: SetId): PokemonSet | undefined {
  return team.members.find((member) => member.id === setId)
}

export function addMember(team: Team, set: PokemonSet): Team {
  return { ...team, members: [...team.members, set] }
}

export function removeMember(team: Team, setId: SetId): Team {
  return { ...team, members: team.members.filter((member) => member.id !== setId) }
}

export function replaceMember(team: Team, set: PokemonSet): Team {
  return {
    ...team,
    members: team.members.map((member) => (member.id === set.id ? set : member)),
  }
}

/** Move a member to a new index, closing the gap it left behind. */
export function reorderMember(team: Team, setId: SetId, toIndex: number): Team {
  const from = team.members.findIndex((member) => member.id === setId)
  if (from === -1) return team
  const members = [...team.members]
  const [moved] = members.splice(from, 1)
  if (moved === undefined) return team
  members.splice(Math.max(0, Math.min(members.length, toIndex)), 0, moved)
  return { ...team, members }
}

/** Duplicate one member in place, directly after the original. */
export function duplicateMember(team: Team, setId: SetId, newId: SetId): Team {
  const index = team.members.findIndex((member) => member.id === setId)
  const original = team.members[index]
  if (original === undefined) return team
  const members = [...team.members]
  members.splice(index + 1, 0, cloneSet(original, newId))
  return { ...team, members }
}

export type CloneTeamInput = {
  readonly team: Team
  readonly id: TeamId
  readonly name: string
  /** One fresh set id per member, in member order. */
  readonly memberIds: readonly SetId[]
}

/**
 * A deep copy under fresh ids. Every member gets a new id so that editing the
 * copy can never reach back into the original.
 */
export function cloneTeam({ team, id, name, memberIds }: CloneTeamInput): Team {
  return {
    ...team,
    id,
    name,
    members: team.members.map((member, index) => {
      const newId = memberIds[index]
      return newId === undefined ? member : cloneSet(member, newId)
    }),
  }
}

export type MoveMemberResult = {
  readonly from: Team
  readonly to: Team
}

/**
 * Move one set from one team to another. Returns both teams so the caller
 * commits them together — a half-applied move loses a Pokémon.
 */
export function moveMemberBetween(from: Team, to: Team, setId: SetId): MoveMemberResult | null {
  const member = findMember(from, setId)
  if (member === undefined) return null
  return { from: removeMember(from, setId), to: addMember(to, member) }
}

/** Copy one set into another team, leaving the original where it is. */
export function copyMemberTo(from: Team, to: Team, setId: SetId, newId: SetId): Team | null {
  const member = findMember(from, setId)
  if (member === undefined) return null
  return addMember(to, cloneSet(member, newId))
}
