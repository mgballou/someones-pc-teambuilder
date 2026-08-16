import type { ReactNode } from 'react'
import Link from 'next/link'
import type { SessionUser } from '../auth/session.js'
import { ThemeToggle } from './theme-toggle.js'
import { NavLink } from './nav-link.js'
import { signOutAction } from '../actions/auth.js'

/**
 * The persistent frame.
 *
 * Top-level navigation never carries the accent — a nav item is not an action.
 * ui-sensibility.md §3, §4.2.
 */
export function AppShell({
  user,
  children,
}: {
  readonly user: SessionUser | null
  readonly children: ReactNode
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-6 px-4">
          <Link
            href={user === null ? '/' : '/teams'}
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <BoxMark />
            <span>
              Someone&apos;s <span className="text-text-dim">PC</span>
            </span>
          </Link>

          {user !== null && (
            <nav className="flex items-center gap-1" aria-label="Main">
              <NavLink href="/teams">Teams</NavLink>
              <NavLink href="/box">Box</NavLink>
              <NavLink href="/formats">Formats</NavLink>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user === null ? (
              <Link
                href="/sign-in"
                className="rounded-box border border-line px-2.5 py-1 text-xs font-medium hover:bg-well"
              >
                Sign in
              </Link>
            ) : (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-box border border-line px-2.5 py-1 text-xs font-medium text-text-dim hover:bg-well hover:text-text"
                >
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
    </div>
  )
}

/** The box mark. Structural nostalgia, not a mascot. ui-sensibility.md §12.5. */
function BoxMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 text-text-dim" aria-hidden="true">
      <rect x="0.5" y="1.5" width="15" height="13" rx="1.5" fill="none" stroke="currentColor" />
      <line x1="0.5" y1="5" x2="15.5" y2="5" stroke="currentColor" />
      <rect x="3" y="7.5" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="7" y="7.5" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.45" />
      <rect x="11" y="7.5" width="2" height="3" rx="0.5" fill="currentColor" opacity="0.2" />
    </svg>
  )
}
