import 'server-only'

import { and, asc, eq, isNull, max } from 'drizzle-orm'
import type { PokemonSet, SetId, Team, TeamId } from '@spc/core'
import { cloneSet } from '@spc/core'
import { db } from '../db/client'
import { pokemonSets, teams } from '../db/schema'
import { toDomainSet, toDomainTeam, toRowValues } from './mappers'
import { NotAuthorized } from '../auth/session'

/**
 * Every function here takes the acting user's id and scopes its query by it.
 *
 * That is the authorization layer, and it is deliberately the *only* one: a
 * query that cannot see another person's rows cannot leak them, so there is no
 * second check to forget. Nothing above this file re-implements the rule.
 */

export type TeamSummary = {
  readonly id: TeamId
  readonly name: string
  readonly format: string
  readonly memberCount: number
  readonly species: readonly string[]
  readonly updatedAt: Date
}

export async function listTeams(userId: string): Promise<readonly TeamSummary[]> {
  const rows = await db.query.teams.findMany({
    where: eq(teams.userId, userId),
    with: { members: { columns: { species: true, position: true } } },
    orderBy: [asc(teams.name)],
  })

  return rows.map((row) => ({
    id: row.id as TeamId,
    name: row.name,
    format: row.formatId,
    memberCount: row.members.length,
    species: [...row.members]
      .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
      .map((member) => member.species),
    updatedAt: row.updatedAt,
  }))
}

export async function getTeam(userId: string, teamId: TeamId): Promise<Team | null> {
  const row = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), eq(teams.userId, userId)),
    with: { members: true },
  })
  return row === undefined ? null : toDomainTeam({ team: row, members: row.members })
}

async function assertOwnsTeam(userId: string, teamId: TeamId): Promise<void> {
  const row = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), eq(teams.userId, userId)),
    columns: { id: true },
  })
  if (row === undefined) throw NotAuthorized.team(teamId)
}

export type CreateTeamInput = {
  readonly userId: string
  readonly name: string
  readonly formatId: string
}

export async function createTeam({ userId, name, formatId }: CreateTeamInput): Promise<TeamId> {
  const [row] = await db
    .insert(teams)
    .values({ userId, name, formatId })
    .returning({ id: teams.id })
  if (row === undefined) throw new Error('Insert returned no row')
  return row.id as TeamId
}

export type UpdateTeamInput = {
  readonly userId: string
  readonly teamId: TeamId
  readonly name?: string
  readonly formatId?: string
  readonly notes?: string
  readonly now: Date
}

export async function updateTeam({
  userId,
  teamId,
  name,
  formatId,
  notes,
  now,
}: UpdateTeamInput): Promise<void> {
  await assertOwnsTeam(userId, teamId)
  await db
    .update(teams)
    .set({
      ...(name === undefined ? {} : { name }),
      ...(formatId === undefined ? {} : { formatId }),
      ...(notes === undefined ? {} : { notes }),
      updatedAt: now,
    })
    .where(and(eq(teams.id, teamId), eq(teams.userId, userId)))
}

export async function deleteTeam(userId: string, teamId: TeamId): Promise<void> {
  await db.delete(teams).where(and(eq(teams.id, teamId), eq(teams.userId, userId)))
}

export type CloneTeamInput = {
  readonly userId: string
  readonly teamId: TeamId
  readonly name: string
}

/**
 * A deep copy under fresh ids, in one transaction. Members are re-keyed so
 * editing the copy can never reach back into the original — the guarantee
 * spec §2 rests on.
 */
export async function cloneTeamDeep({ userId, teamId, name }: CloneTeamInput): Promise<TeamId> {
  const source = await getTeam(userId, teamId)
  if (source === null) throw NotAuthorized.team(teamId)

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(teams)
      .values({ userId, name, formatId: source.format, notes: source.notes, tags: source.tags })
      .returning({ id: teams.id })
    if (created === undefined) throw new Error('Insert returned no row')

    if (source.members.length > 0) {
      await tx.insert(pokemonSets).values(
        source.members.map((member, index) =>
          toRowValues({
            userId,
            teamId: created.id,
            position: index,
            set: cloneSet(member, crypto.randomUUID() as SetId),
          }),
        ),
      )
    }

    return created.id as TeamId
  })
}

async function nextPosition(teamId: TeamId): Promise<number> {
  const [row] = await db
    .select({ highest: max(pokemonSets.position) })
    .from(pokemonSets)
    .where(eq(pokemonSets.teamId, teamId))
  return (row?.highest ?? -1) + 1
}

export type AddSetInput = {
  readonly userId: string
  readonly teamId: TeamId
  readonly set: PokemonSet
}

export async function addSetToTeam({ userId, teamId, set }: AddSetInput): Promise<void> {
  await assertOwnsTeam(userId, teamId)
  const position = await nextPosition(teamId)
  await db.insert(pokemonSets).values(toRowValues({ userId, teamId, position, set }))
}

export type SaveSetInput = {
  readonly userId: string
  readonly set: PokemonSet
  readonly now: Date
}

export async function saveSet({ userId, set, now }: SaveSetInput): Promise<void> {
  const values = toRowValues({ userId, teamId: null, position: null, set })
  const { id: _id, userId: _userId, teamId: _teamId, position: _position, ...mutable } = values
  const updated = await db
    .update(pokemonSets)
    .set({ ...mutable, updatedAt: now })
    .where(and(eq(pokemonSets.id, set.id), eq(pokemonSets.userId, userId)))
    .returning({ id: pokemonSets.id })
  if (updated.length === 0) throw NotAuthorized.set(set.id)
}

export async function deleteSet(userId: string, setId: SetId): Promise<void> {
  await db.delete(pokemonSets).where(and(eq(pokemonSets.id, setId), eq(pokemonSets.userId, userId)))
}

/** Duplicate in place, landing directly after the original. */
export async function duplicateSet(userId: string, setId: SetId): Promise<SetId> {
  const row = await db.query.pokemonSets.findFirst({
    where: and(eq(pokemonSets.id, setId), eq(pokemonSets.userId, userId)),
  })
  if (row === undefined) throw NotAuthorized.set(setId)

  const copy = cloneSet(toDomainSet(row), crypto.randomUUID() as SetId)
  const position = row.position === null ? null : row.position + 1

  return db.transaction(async (tx) => {
    if (row.teamId !== null && position !== null) {
      const siblings = await tx.query.pokemonSets.findMany({
        where: eq(pokemonSets.teamId, row.teamId),
        columns: { id: true, position: true },
      })
      for (const sibling of siblings) {
        if (sibling.position !== null && sibling.position >= position) {
          await tx
            .update(pokemonSets)
            .set({ position: sibling.position + 1 })
            .where(eq(pokemonSets.id, sibling.id))
        }
      }
    }
    await tx
      .insert(pokemonSets)
      .values(toRowValues({ userId, teamId: row.teamId, position, set: copy }))
    return copy.id
  })
}

export type ReorderInput = {
  readonly userId: string
  readonly teamId: TeamId
  /** Set ids in their new order. */
  readonly order: readonly SetId[]
}

export async function reorderMembers({ userId, teamId, order }: ReorderInput): Promise<void> {
  await assertOwnsTeam(userId, teamId)
  await db.transaction(async (tx) => {
    for (const [index, setId] of order.entries()) {
      await tx
        .update(pokemonSets)
        .set({ position: index })
        .where(and(eq(pokemonSets.id, setId), eq(pokemonSets.userId, userId)))
    }
  })
}

export type TransferInput = {
  readonly userId: string
  readonly setId: SetId
  readonly toTeamId: TeamId
}

/** Move a set onto another team. The source team loses it. */
export async function moveSetToTeam({ userId, setId, toTeamId }: TransferInput): Promise<void> {
  await assertOwnsTeam(userId, toTeamId)
  const position = await nextPosition(toTeamId)
  const updated = await db
    .update(pokemonSets)
    .set({ teamId: toTeamId, position })
    .where(and(eq(pokemonSets.id, setId), eq(pokemonSets.userId, userId)))
    .returning({ id: pokemonSets.id })
  if (updated.length === 0) throw NotAuthorized.set(setId)
}

/** Copy a set onto another team, leaving the original where it is. */
export async function copySetToTeam({ userId, setId, toTeamId }: TransferInput): Promise<SetId> {
  await assertOwnsTeam(userId, toTeamId)
  const row = await db.query.pokemonSets.findFirst({
    where: and(eq(pokemonSets.id, setId), eq(pokemonSets.userId, userId)),
  })
  if (row === undefined) throw NotAuthorized.set(setId)

  const copy = cloneSet(toDomainSet(row), crypto.randomUUID() as SetId)
  const position = await nextPosition(toTeamId)
  await db
    .insert(pokemonSets)
    .values(toRowValues({ userId, teamId: toTeamId, position, set: copy }))
  return copy.id
}

/* ---------------------------------------------------------------- the Box */

export async function listBoxSets(userId: string): Promise<readonly PokemonSet[]> {
  const rows = await db.query.pokemonSets.findMany({
    where: and(eq(pokemonSets.userId, userId), isNull(pokemonSets.teamId)),
    orderBy: [asc(pokemonSets.species)],
  })
  return rows.map(toDomainSet)
}

/** Copy a team member into the Box. A snapshot, not a link. See spec §2. */
export async function saveToBox(userId: string, setId: SetId): Promise<SetId> {
  const row = await db.query.pokemonSets.findFirst({
    where: and(eq(pokemonSets.id, setId), eq(pokemonSets.userId, userId)),
  })
  if (row === undefined) throw NotAuthorized.set(setId)

  const copy = cloneSet(toDomainSet(row), crypto.randomUUID() as SetId)
  await db
    .insert(pokemonSets)
    .values(toRowValues({ userId, teamId: null, position: null, set: copy }))
  return copy.id
}

/** Copy a Box set into a team slot. Also a snapshot. */
export async function pullFromBox({ userId, setId, toTeamId }: TransferInput): Promise<SetId> {
  return copySetToTeam({ userId, setId, toTeamId })
}
