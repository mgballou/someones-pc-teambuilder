'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signInAction, signUpAction, type AuthState } from '../actions/auth'
import { Button } from './button'

const INITIAL: AuthState = { error: null }

/**
 * Validation is inline and next to the form, never a summary banner at the
 * top of the page. ui-sensibility.md §10.
 */
export function CredentialsForm({ mode }: { readonly mode: 'sign-in' | 'sign-up' }) {
  const signingIn = mode === 'sign-in'
  const [state, action, pending] = useActionState(signingIn ? signInAction : signUpAction, INITIAL)

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-lg font-semibold tracking-tight">
        {signingIn ? 'Sign in' : 'Create an account'}
      </h1>

      <form action={action} className="panel mt-4 flex flex-col gap-3 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-dim">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="well px-2 py-1.5 text-sm outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-dim">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={signingIn ? 'current-password' : 'new-password'}
            className="well px-2 py-1.5 text-sm outline-none"
          />
        </label>

        {state.error !== null && (
          <p className="text-xs" style={{ color: 'var(--danger)' }} role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Working' : signingIn ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="mt-3 text-xs text-text-dim">
        {signingIn ? (
          <>
            No account?{' '}
            <Link href="/sign-up" className="underline underline-offset-4">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already registered?{' '}
            <Link href="/sign-in" className="underline underline-offset-4">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
