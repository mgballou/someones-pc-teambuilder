'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * A panel with something wrong in it says so on its own tab, so nobody has to
 * visit a panel to learn it needs them. ui-sensibility.md §7.3.
 */
const PANELS = [
  { segment: '', label: 'Build' },
  { segment: 'damage', label: 'Damage' },
  { segment: 'speed', label: 'Speed' },
  { segment: 'coverage', label: 'Coverage' },
  { segment: 'legality', label: 'Legality' },
] as const

export function SubNav({
  teamId,
  violationCount,
}: {
  readonly teamId: string
  readonly violationCount: number
}) {
  const pathname = usePathname()
  const base = `/teams/${teamId}`

  return (
    <nav className="flex gap-px border-t border-line bg-line" aria-label="Team panels">
      {PANELS.map(({ segment, label }) => {
        const href = segment === '' ? base : `${base}/${segment}`
        const active = pathname === href
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'flex items-center gap-1.5 bg-panel px-3 py-1.5 text-xs font-semibold'
                : 'flex items-center gap-1.5 bg-well/60 px-3 py-1.5 text-xs text-text-dim hover:bg-panel hover:text-text'
            }
          >
            {label}
            {label === 'Legality' && violationCount > 0 && (
              <span
                className="num rounded-box px-1 text-[0.625rem] font-semibold"
                style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-soft)' }}
              >
                {violationCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
