import Link from 'next/link'
import type { TeamHeaderView } from '../lib/view.js'
import { SubNav } from './sub-nav.js'
import { formatCount } from '../lib/format.js'
import { TeamMenu } from './team-menu.js'

/**
 * The three standing numbers people actually check: how full the team is, how
 * many rules it breaks, and how concentrated its weaknesses are.
 * ui-sensibility.md §2.3.
 */
export function TeamHeader({ header }: { readonly header: TeamHeaderView }) {
  return (
    <header className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">{header.name}</h1>
          <Link
            href="/formats"
            className="text-[0.6875rem] text-text-faint underline-offset-4 hover:underline"
          >
            {header.formatName}
          </Link>
        </div>

        <dl className="flex items-center gap-4 text-xs">
          <Standing label="Members">
            {formatCount(header.memberCount, header.teamSize)}
          </Standing>
          <Standing
            label="Problems"
            tone={header.violationCount > 0 ? 'danger' : 'ok'}
          >
            {header.violationCount}
          </Standing>
          <Standing
            label="Shared weak"
            tone={header.sharedWeaknessCount > 2 ? 'warn' : undefined}
          >
            {header.sharedWeaknessCount}
          </Standing>
        </dl>

        <div className="ml-auto">
          <TeamMenu teamId={header.id} teamName={header.name} />
        </div>
      </div>

      <SubNav teamId={header.id} violationCount={header.violationCount} />
    </header>
  )
}

function Standing({
  label,
  tone,
  children,
}: {
  readonly label: string
  readonly tone?: 'danger' | 'warn' | 'ok'
  readonly children: React.ReactNode
}) {
  const color =
    tone === 'danger'
      ? 'var(--danger)'
      : tone === 'warn'
        ? 'var(--warn)'
        : tone === 'ok'
          ? 'var(--text-dim)'
          : 'var(--text)'

  return (
    <div className="flex flex-col">
      <dt className="text-[0.625rem] uppercase tracking-wider text-text-faint">{label}</dt>
      <dd className="num text-xs font-semibold" style={{ color }}>
        {children}
      </dd>
    </div>
  )
}
