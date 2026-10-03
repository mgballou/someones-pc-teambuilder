import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { noDatabase, testEmail, testUsers } from '../harness/database'
import { cookieJar, redirectOf, resetRequest } from '../harness/request'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => import('../harness/request').then((m) => m.nextHeaders))
vi.mock('next/navigation', () => import('../harness/request').then((m) => m.nextNavigation))
vi.mock('next/cache', () => import('../harness/request').then((m) => m.nextCache))

const { signInAction, signOutAction, signUpAction } = await import('../../src/actions/auth')
const { db } = await import('../../src/db/client')
const { sessions, users } = await import('../../src/db/schema')

const PASSWORD = 'correct horse battery'
const NO_ERROR = { error: null }

function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

async function sessionsOf(userId: string) {
  return db.select().from(sessions).where(eq(sessions.userId, userId))
}

describe.skipIf(noDatabase)('auth actions', () => {
  const people = testUsers()

  beforeEach(() => resetRequest())
  afterAll(() => people.removeAll())

  describe('signInAction', () => {
    it('refuses a malformed email before looking anyone up', async () => {
      const result = await signInAction(NO_ERROR, form({ email: 'nope', password: PASSWORD }))
      expect(result).toEqual({ error: 'Enter a valid email address.' })
    })

    it('refuses an address with no account', async () => {
      const result = await signInAction(NO_ERROR, form({ email: testEmail(), password: PASSWORD }))
      expect(result).toEqual({ error: 'No account with that email and password.' })
    })

    it('refuses a wrong password with the same message as a missing account', async () => {
      const person = await people.create({ password: PASSWORD })
      const result = await signInAction(
        NO_ERROR,
        form({ email: person.email, password: 'not the password' }),
      )
      expect(result).toEqual({ error: 'No account with that email and password.' })
    })

    it('refuses an account with no password, such as one made through OAuth', async () => {
      const person = await people.create()
      const result = await signInAction(NO_ERROR, form({ email: person.email, password: PASSWORD }))
      expect(result).toEqual({ error: 'No account with that email and password.' })
    })

    it('opens no session when it refuses', async () => {
      const person = await people.create({ password: PASSWORD })
      await signInAction(NO_ERROR, form({ email: person.email, password: 'not the password' }))
      expect(await sessionsOf(person.id)).toHaveLength(0)
    })

    it('sends a correct password on to the teams page', async () => {
      const person = await people.create({ password: PASSWORD })
      const target = await redirectOf(() =>
        signInAction(NO_ERROR, form({ email: person.email, password: PASSWORD })),
      )
      expect(target).toBe('/teams')
    })

    it('writes a session row whose token is the cookie', async () => {
      const person = await people.create({ password: PASSWORD })
      await redirectOf(() =>
        signInAction(NO_ERROR, form({ email: person.email, password: PASSWORD })),
      )
      const [session] = await sessionsOf(person.id)
      expect(cookieJar.get('spc_session')?.value).toBe(session?.token)
    })
  })

  describe('signUpAction', () => {
    it('refuses a password under eight characters', async () => {
      const result = await signUpAction(NO_ERROR, form({ email: testEmail(), password: 'short' }))
      expect(result).toEqual({ error: 'Use at least 8 characters.' })
    })

    it('refuses an address that is already registered', async () => {
      const person = await people.create({ password: PASSWORD })
      const result = await signUpAction(NO_ERROR, form({ email: person.email, password: PASSWORD }))
      expect(result).toEqual({ error: 'That email is already registered.' })
    })

    it('creates the account and signs it in', async () => {
      const email = testEmail()
      const target = await redirectOf(() =>
        signUpAction(NO_ERROR, form({ email, password: PASSWORD })),
      )
      const [created] = await db.select().from(users).where(eq(users.email, email))
      if (created !== undefined) people.adopt(created.id)

      expect(target).toBe('/teams')
      expect(created?.passwordHash).not.toContain(PASSWORD)
      expect(await sessionsOf(created?.id ?? '')).toHaveLength(1)
    })
  })

  describe('signOutAction', () => {
    it('deletes the session row, clears the cookie and goes home', async () => {
      const person = await people.create({ password: PASSWORD })
      await redirectOf(() =>
        signInAction(NO_ERROR, form({ email: person.email, password: PASSWORD })),
      )

      const target = await redirectOf(() => signOutAction())

      expect(target).toBe('/')
      expect(cookieJar.has('spc_session')).toBe(false)
      expect(await sessionsOf(person.id)).toHaveLength(0)
    })
  })
})
