import Image from 'next/image'
import type { SetView } from '../lib/view'
import { TeraBadge, TypeBadge } from './type-badge'
import { formatEvLine } from '../lib/format'
import { spriteUrl } from '../lib/sprites'

/**
 * The app's signature component.
 *
 * It carries species, item, ability, nature, an EV line and four moves in a
 * small space and has to stay scannable. Get this right and the rest follows.
 * ui-sensibility.md §6.4.
 *
 * A filled slot is `raised` — an object sitting in the recess an empty slot
 * cuts into the panel. That contrast is the whole reason the grid reads as
 * hardware. §5.
 */

export type SetCardProps = {
  readonly view: SetView
  readonly slotNumber: number
  readonly children?: React.ReactNode
}

export function SetCard({ view, slotNumber, children }: SetCardProps) {
  const { set } = view
  const hasProblems = view.problems.length > 0

  return (
    <article
      className="raised relative flex flex-col gap-2 p-2.5"
      aria-label={`Slot ${slotNumber}: ${view.speciesName}`}
    >
      <header className="flex items-start gap-2.5">
        <div className="well flex size-14 shrink-0 items-center justify-center overflow-hidden">
          <Image
            src={spriteUrl(view.spriteUrl)}
            alt=""
            width={56}
            height={56}
            className="size-14 object-contain [image-rendering:pixelated]"
            unoptimized
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="num text-[0.625rem] text-text-faint">
              {String(slotNumber).padStart(2, '0')}
            </span>
            <h3 className="truncate text-sm font-semibold leading-tight">
              {set.nickname ?? view.speciesName}
            </h3>
            {hasProblems && (
              <span
                className="ml-auto shrink-0 rounded-box px-1.5 py-px text-[0.625rem] font-semibold"
                style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-soft)' }}
              >
                {view.problems.length}
              </span>
            )}
          </div>

          {set.nickname !== null && (
            <p className="truncate text-xs text-text-dim">{view.speciesName}</p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-1">
            {view.types.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
            ))}
            {view.teraType !== null && <TeraBadge type={view.teraType} />}
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
        <dt className="text-text-faint">Item</dt>
        <dd className="truncate">{view.itemName ?? <Absent>No item</Absent>}</dd>
        <dt className="text-text-faint">Ability</dt>
        <dd className="truncate">{view.abilityName ?? <Absent>No ability</Absent>}</dd>
        <dt className="text-text-faint">Nature</dt>
        <dd className="truncate capitalize">{set.nature}</dd>
        <dt className="text-text-faint">EVs</dt>
        <dd className="num truncate text-[0.6875rem]">{formatEvLine(set.evs)}</dd>
      </dl>

      <ul className="grid grid-cols-2 gap-1">
        {view.moves.map((move, index) => (
          <li key={index}>
            {move === null ? (
              <span className="well block truncate px-1.5 py-1 text-[0.6875rem] text-text-faint">
                —
              </span>
            ) : (
              <span
                className="block truncate border-l-2 bg-well/60 px-1.5 py-1 text-[0.6875rem]"
                style={{ borderLeftColor: `var(--type-${move.type})` }}
                title={`${move.name} · ${move.category} · ${move.basePower === 0 ? '—' : move.basePower} BP`}
              >
                {move.name}
              </span>
            )}
          </li>
        ))}
      </ul>

      {children}
    </article>
  )
}

function Absent({ children }: { readonly children: React.ReactNode }) {
  return <span className="text-text-faint">{children}</span>
}

/**
 * An empty slot is a well, not a card. It is recessed, and it offers the two
 * real paths rather than saying "nothing here". ui-sensibility.md §2.7, §5.
 */
export function EmptySlot({
  slotNumber,
  children,
}: {
  readonly slotNumber: number
  readonly children?: React.ReactNode
}) {
  return (
    <div
      className="well flex min-h-[13.5rem] flex-col items-center justify-center gap-2 p-3"
      aria-label={`Slot ${slotNumber}, empty`}
    >
      <span className="num text-[0.625rem] text-text-faint">
        {String(slotNumber).padStart(2, '0')}
      </span>
      {children}
    </div>
  )
}
