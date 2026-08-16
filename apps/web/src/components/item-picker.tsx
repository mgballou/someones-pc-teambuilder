'use client'

import { useEffect, useState } from 'react'

type Match = {
  readonly id: string
  readonly name: string
  /** False when the calculator has no model for this item's effect. */
  readonly modelled: boolean
}

/**
 * There are roughly a thousand items, so the list is searched on the server
 * rather than shipped. §10 — every picker is searchable and keyboard-first.
 *
 * An item the calculator does not model is still selectable and says so, per
 * the honesty rules. Hiding it would be worse: people run those items.
 */
export function ItemPicker({
  value,
  currentName,
  onChange,
}: {
  readonly value: string | null
  readonly currentName: string | null
  readonly onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<readonly Match[]>([])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/items?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((body: { matches: readonly Match[] }) => setMatches(body.matches))
        .catch(() => undefined)
    }, 120)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, open])

  if (!open) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="well flex-1 px-2 py-1 text-left text-xs"
        >
          {currentName ?? (value === null ? 'No item' : value)}
        </button>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove item"
            className="rounded-box border border-line px-1.5 py-1 text-[0.6875rem] text-text-dim hover:bg-well"
          >
            ✕
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        placeholder="Search items"
        aria-label="Search items"
        className="raised w-full px-2 py-1 text-xs outline-none"
      />
      <ul className="max-h-40 overflow-y-auto">
        {matches.map((match) => (
          <li key={match.id}>
            <button
              type="button"
              onClick={() => {
                onChange(match.id)
                setOpen(false)
                setQuery('')
              }}
              className="flex w-full items-center gap-1.5 px-1 py-0.5 text-left text-[0.6875rem] hover:bg-well"
            >
              <span className="truncate">{match.name}</span>
              {!match.modelled && (
                <span className="ml-auto shrink-0 text-[0.625rem] text-text-faint">
                  not in calc
                </span>
              )}
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-1 py-1 text-[0.6875rem] text-text-faint">No items match.</li>
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
