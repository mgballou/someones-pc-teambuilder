'use client'

import { useState } from 'react'
import type { MoveCategory, PokemonType } from '@spc/core'
import { TypeBadge } from './type-badge'

export type MoveOption = {
  readonly id: string
  readonly name: string
  readonly type: PokemonType
  readonly category: MoveCategory
  readonly basePower: number
  readonly accuracy: number | null
  /** True when base power is decided in battle, as Gyro Ball's and Grass Knot's are. */
  readonly powerVaries: boolean
}

/**
 * A move slot. §10 — a picker is searchable and keyboard-first, and it shows
 * what the choice is actually made on: type, category, power, accuracy.
 *
 * The four facts each get their own labelled place rather than sharing one run
 * of text. The old row read `Hurricane · spe · 110 · 70`, where `spe` is read
 * as *speed* by everyone who plays this game, and where the two numbers are
 * only distinguishable if you already know the order. Category is written out;
 * the numbers are labelled and tabular; the type is a badge, which is the one
 * sanctioned place for a type hue (§4.3).
 *
 * A move whose power is decided in battle says `varies` rather than showing a
 * dash beside a status move's genuine absence of power. CLAUDE.md §Honesty.
 */
export function MovePicker({
  slot,
  value,
  moves,
  onChange,
}: {
  readonly slot: number
  readonly value: string | null
  readonly moves: readonly MoveOption[]
  readonly onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = moves.find((move) => move.id === value)
  const matches =
    query.trim() === ''
      ? moves
      : moves.filter((move) => move.name.toLowerCase().includes(query.trim().toLowerCase()))

  function choose(id: string | null) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Move ${slot}`}
        className="well flex w-full items-center gap-2 px-2 py-1.5 text-left"
      >
        <span className="min-w-0 flex-1">
          {selected === undefined ? (
            <span className="text-xs text-text-faint">Empty slot</span>
          ) : (
            <MoveLine move={selected} />
          )}
        </span>
        {/* The row replaced a native select, and a select's chevron was the
            only thing saying the row could be changed. Keep the affordance. */}
        <svg viewBox="0 0 10 6" aria-hidden="true" className="size-2.5 shrink-0 text-text-faint">
          <path d="M1 1 L5 5 L9 1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    )
  }

  return (
    <div className="raised flex flex-col gap-1 p-1.5">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter') {
            const first = matches[0]
            if (first !== undefined) choose(first.id)
          }
        }}
        placeholder="Search moves"
        aria-label={`Search moves for slot ${slot}`}
        className="well w-full px-2 py-1 text-xs outline-none"
      />

      <ul className="max-h-56 overflow-y-auto">
        <li>
          <button
            type="button"
            onClick={() => choose(null)}
            className="w-full px-1.5 py-1 text-left text-xs text-text-faint hover:bg-well"
          >
            Empty slot
          </button>
        </li>
        {matches.map((move) => (
          <li key={move.id}>
            <button
              type="button"
              onClick={() => choose(move.id)}
              className="w-full px-1.5 py-1 text-left hover:bg-well"
            >
              <MoveLine move={move} />
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-1.5 py-1 text-[0.6875rem] text-text-faint">No moves match.</li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => setOpen(false)}
        className="self-start text-[0.6875rem] text-text-faint underline underline-offset-2"
      >
        Cancel
      </button>
    </div>
  )
}

const CATEGORY_LABEL: Readonly<Record<MoveCategory, string>> = {
  physical: 'Physical',
  special: 'Special',
  status: 'Status',
}

/**
 * The chosen move and a row in the list are the same shape, so choosing does
 * not change what you are reading.
 */
function MoveLine({ move }: { readonly move: MoveOption }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="block truncate text-xs font-medium">{move.name}</span>
      <span className="flex items-center gap-2">
        <TypeBadge type={move.type} size="sm" />
        <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-text-dim">
          {CATEGORY_LABEL[move.category]}
        </span>
        <span className="ml-auto flex shrink-0 items-baseline gap-2.5">
          <Reading label="Power" value={powerReading(move)} width="min-w-[3rem]" />
          <Reading label="Acc" value={accuracyReading(move)} width="min-w-[2.25rem]" />
        </span>
      </span>
    </span>
  )
}

/**
 * The value takes a fixed width so Power and Accuracy read as columns down the
 * four slots rather than sliding with the digit count. §6.1.
 */
function Reading({
  label,
  value,
  width,
}: {
  readonly label: string
  readonly value: string
  readonly width: string
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[0.625rem] uppercase tracking-wider text-text-faint">{label}</span>
      <span className={`num text-right text-[0.6875rem] ${width}`}>{value}</span>
    </span>
  )
}

function powerReading(move: MoveOption): string {
  if (move.powerVaries) return 'varies'
  return move.basePower === 0 ? '—' : String(move.basePower)
}

function accuracyReading(move: MoveOption): string {
  return move.accuracy === null ? '—' : `${move.accuracy}%`
}
