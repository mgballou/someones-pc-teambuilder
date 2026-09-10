import { sourceFreshness } from '@spc/core'
import type { FormatSource } from '@spc/core'

/**
 * How old a curated ruleset is, said out loud.
 *
 * A date on its own asks the reader to do arithmetic and to know that Smogon
 * retiers monthly while Play! Pokémon rotates a regulation on its own clock.
 * Neither is reasonable, so the format declares its own window, `@spc/core`
 * does the subtraction, and this says which side of the window the reading
 * falls on. CLAUDE.md §Honesty rules.
 *
 * `today` is passed in rather than read here, because the core may not read a
 * clock and the two callers already render on the server.
 */
export function VerifiedOn({
  source,
  today,
}: {
  readonly source: FormatSource
  readonly today: string
}) {
  const freshness = sourceFreshness(source, today)

  return (
    <>
      <span className="num">{source.verifiedOn}</span>{' '}
      <span
        className="text-[0.6875rem]"
        style={{ color: freshness.kind === 'stale' ? 'var(--warn)' : 'var(--text-faint)' }}
      >
        {freshness.kind === 'unchanging'
          ? '· defined here, so it cannot go out of date'
          : freshness.kind === 'fresh'
            ? `· ${readWhen(freshness.ageInDays)}`
            : `· ${readWhen(freshness.ageInDays)}, past its ${freshness.staleAfterDays}-day window`}
      </span>
    </>
  )
}

function readWhen(days: number): string {
  if (days <= 0) return 'read today'
  return days === 1 ? 'read 1 day ago' : `read ${days} days ago`
}

/** UTC, so the same render on two machines never disagrees by a day. */
export function todayInUtc(): string {
  return new Date().toISOString().slice(0, 10)
}
