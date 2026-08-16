'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/client'
import { users } from '../db/schema'
import { endSession, hashPassword, startSession, verifyPassword } from '../auth/session'

const credentials = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
})

export type AuthState = { readonly error: string | null }

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) })
  if (user === undefined || user.passwordHash === null) {
    return { error: 'No account with that email and password.' }
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash)
  if (!valid) {
    return { error: 'No account with that email and password.' }
  }

  await startSession(user.id, new Date())
  redirect('/teams')
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form.' }
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) })
  if (existing !== undefined) {
    return { error: 'That email is already registered.' }
  }

  const passwordHash = await hashPassword(parsed.data.password)
  const [created] = await db
    .insert(users)
    .values({ email: parsed.data.email, passwordHash })
    .returning({ id: users.id })
  if (created === undefined) {
    return { error: 'Could not create the account.' }
  }

  await startSession(created.id, new Date())
  redirect('/teams')
}

export async function signOutAction(): Promise<never> {
  await endSession()
  revalidatePath('/')
  redirect('/')
}
