import 'server-only'

import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { and, eq, gt, lt } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from '../db/client.js'
import { sessions, users } from '../db/schema.js'
import type { UserRow } from '../db/schema.js'

/**
 * Opaque server-side sessions.
 *
 * The cookie holds a random token and nothing else — no claims, no signature
 * to verify, no user data to go stale. Signing out deletes the row, so it
 * actually ends the session rather than waiting out an expiry. The cost is
 * one indexed primary-key lookup per request, which is the right trade.
 */

const COOKIE_NAME = 'spc_session'
const SESSION_DAYS = 30
const BCRYPT_ROUNDS = 12

export type SessionUser = {
  readonly id: string
  readonly email: string
  readonly name: string | null
  readonly image: string | null
}

function toSessionUser(row: UserRow): SessionUser {
  return { id: row.id, email: row.email, name: row.name, image: row.image }
}

function newToken(): string {
  return randomBytes(32).toString('base64url')
}

function expiryFrom(now: Date): Date {
  return new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000)
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** Issue a session and set the cookie. Called only from a server action. */
export async function startSession(userId: string, now: Date): Promise<void> {
  const token = newToken()
  const expiresAt = expiryFrom(now)

  await db.insert(sessions).values({ token, userId, expiresAt })

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function endSession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token !== undefined) {
    await db.delete(sessions).where(eq(sessions.token, token))
  }
  jar.delete(COOKIE_NAME)
}

/** The signed-in user, or null. Never throws on an absent or stale cookie. */
export async function currentUser(now: Date): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token === undefined) return null

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1)

  const row = rows[0]
  return row === undefined ? null : toSessionUser(row.user)
}

/**
 * The signed-in user, or a thrown `NotAuthenticated`.
 *
 * Every server action that touches a person's data calls this first. It is the
 * one place authorization starts, so there is exactly one thing to audit.
 */
export async function requireUser(now: Date): Promise<SessionUser> {
  const user = await currentUser(now)
  if (user === null) throw NotAuthenticated.noSession()
  return user
}

/** Housekeeping. Called opportunistically, never on the request path. */
export async function purgeExpiredSessions(now: Date): Promise<number> {
  const deleted = await db.delete(sessions).where(lt(sessions.expiresAt, now)).returning()
  return deleted.length
}

export class NotAuthenticated extends Error {
  override readonly name = 'NotAuthenticated'

  private constructor(reason: string) {
    super(reason)
  }

  static noSession(): NotAuthenticated {
    return new NotAuthenticated('No active session.')
  }
}

export class NotAuthorized extends Error {
  override readonly name = 'NotAuthorized'

  private constructor(
    readonly resource: string,
    readonly id: string,
  ) {
    super(`Not allowed to act on ${resource} ${id}.`)
  }

  static team(id: string): NotAuthorized {
    return new NotAuthorized('team', id)
  }

  static set(id: string): NotAuthorized {
    return new NotAuthorized('set', id)
  }
}
