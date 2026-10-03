import '../../src/env'
import postgres from 'postgres'
import { asc, eq, inArray } from 'drizzle-orm'
import type { PokemonSet, SetId, TeamId } from '@spc/core'
import { newSet, speciesId } from '@spc/core'
import { hashPassword } from '../../src/auth/password'
import { db } from '../../src/db/client'
import { connectionString } from '../../src/db/config'
import type { PokemonSetRow, TeamRow } from '../../src/db/schema'
import { pokemonSets, teams, users } from '../../src/db/schema'
import { toRowValues } from '../../src/data/mappers'

/**
 * The real Postgres, shared with `pnpm dev`, and the rows a test leaves in it.
 *
 * Nothing here truncates a table. Each test file makes its own users under
 * addresses no person would register, and deletes them when it ends; the
 * foreign keys cascade, so their teams, sets and sessions go with them. That
 * keeps the seeded demo account intact on a developer's machine, and lets the
 * files run in parallel without seeing each other's rows.
 *
 * Without a database the suites skip on a laptop and fail in CI. A database
 * that answers but has no schema always fails, because the fix is one command.
 */

export type DatabaseStatus =
  { readonly kind: 'ready' } | { readonly kind: 'unreachable'; readonly reason: string }

export class DatabaseNotReady extends Error {
  override readonly name = 'DatabaseNotReady'

  private constructor(message: string) {
    super(message)
  }

  static unreachable(reason: string): DatabaseNotReady {
    return new DatabaseNotReady(
      `No Postgres answered at DATABASE_URL (${reason}). CI runs one; locally, run pnpm db:up.`,
    )
  }

  static noSchema(): DatabaseNotReady {
    return new DatabaseNotReady('Postgres answered but has no schema. Run pnpm db:push.')
  }
}

async function probe(): Promise<DatabaseStatus> {
  const sql = postgres(connectionString(), { max: 1, connect_timeout: 3, onnotice: () => {} })
  try {
    const [row] = await sql<
      { table: string | null }[]
    >`select to_regclass('public.pokemon_sets') as table`
    if (row?.table === null) throw DatabaseNotReady.noSchema()
    return { kind: 'ready' }
  } catch (error) {
    if (error instanceof DatabaseNotReady) throw error
    const reason = error instanceof Error ? error.message : 'unknown error'
    if (process.env.CI === 'true') throw DatabaseNotReady.unreachable(reason)
    return { kind: 'unreachable', reason }
  } finally {
    await sql.end({ timeout: 1 })
  }
}

export const database = await probe()

export const noDatabase = database.kind !== 'ready'

/** An address under a reserved domain, so no test user can collide with a real one. */
export function testEmail(): string {
  return `test-${crypto.randomUUID()}@someones-pc.test`
}

type Created = { readonly id: string; readonly email: string }

export type SeededTeam = {
  readonly id: TeamId
  readonly members: readonly SetId[]
}

/**
 * Users made by one test file, removed together at its end.
 *
 * Postgres-js connects on its first query, so a file that skips never opens
 * the pool.
 */
export function testUsers() {
  const made: string[] = []

  return {
    async create(options: { readonly password?: string } = {}): Promise<Created> {
      const passwordHash =
        options.password === undefined ? null : await hashPassword(options.password)
      const [row] = await db
        .insert(users)
        .values({ email: testEmail(), passwordHash })
        .returning({ id: users.id, email: users.email })
      if (row === undefined) throw DatabaseNotReady.noSchema()
      made.push(row.id)
      return row
    },

    /** Record a user an action created, so it is removed with the rest. */
    adopt(id: string): void {
      made.push(id)
    },

    async removeAll(): Promise<void> {
      if (made.length === 0) return
      await db.delete(users).where(inArray(users.id, made))
      made.length = 0
    },
  }
}

/**
 * Sign a user in the way `signInAction` does, through the real session table.
 *
 * Imported lazily because `session.ts` is `server-only`, which a test file
 * has to mock before it can load.
 */
export async function signIn(userId: string): Promise<void> {
  const { startSession } = await import('../../src/auth/session')
  await startSession(userId, new Date())
}

export type SeedTeamInput = {
  readonly userId: string
  readonly species?: readonly string[]
  readonly formatId?: string
  readonly name?: string
}

/** A team row and its members, written straight through the mappers. */
export async function seedTeam({
  userId,
  species = [],
  formatId = 'gen9-ou',
  name = `Team ${crypto.randomUUID()}`,
}: SeedTeamInput): Promise<SeededTeam> {
  const [team] = await db
    .insert(teams)
    .values({ userId, name, formatId })
    .returning({ id: teams.id })
  if (team === undefined) throw DatabaseNotReady.noSchema()

  const members = species.map((id) =>
    newSet({ id: crypto.randomUUID() as SetId, species: speciesId(id) }),
  )
  if (members.length > 0) {
    await db
      .insert(pokemonSets)
      .values(
        members.map((set, position) => toRowValues({ userId, teamId: team.id, position, set })),
      )
  }

  return { id: team.id as TeamId, members: members.map((set) => set.id) }
}

/** A set in the Box, which is a set with no team. */
export async function seedBoxSet(userId: string, species: string): Promise<SetId> {
  const set: PokemonSet = newSet({ id: crypto.randomUUID() as SetId, species: speciesId(species) })
  await db.insert(pokemonSets).values(toRowValues({ userId, teamId: null, position: null, set }))
  return set.id
}

/** A team's member rows in slot order. */
export async function membersOf(teamId: string): Promise<readonly PokemonSetRow[]> {
  return db.query.pokemonSets.findMany({
    where: eq(pokemonSets.teamId, teamId),
    orderBy: [asc(pokemonSets.position)],
  })
}

export async function setRow(setId: string): Promise<PokemonSetRow | undefined> {
  return db.query.pokemonSets.findFirst({ where: eq(pokemonSets.id, setId) })
}

export async function teamRow(teamId: string): Promise<TeamRow | undefined> {
  return db.query.teams.findFirst({ where: eq(teams.id, teamId) })
}

export async function teamsOf(userId: string): Promise<readonly TeamRow[]> {
  return db.query.teams.findMany({ where: eq(teams.userId, userId) })
}

export async function boxOf(userId: string): Promise<readonly PokemonSetRow[]> {
  const rows = await db.query.pokemonSets.findMany({ where: eq(pokemonSets.userId, userId) })
  return rows.filter((row) => row.teamId === null)
}
