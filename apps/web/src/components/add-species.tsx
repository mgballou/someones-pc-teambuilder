'use client'

import { useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import { addSpeciesAction } from '../actions/teams.js'
import { spriteUrl } from '../lib/sprites.js'
import { Button } from './button.js'

type Match = {
  readonly id: string
  readonly name: string
  readonly dexNumber: number
  readonly types: readonly string[]
  readonly spriteKey: string
}

/**
 * Sequenced, not flattened: an empty slot shows one control, and the picker
 * only exists once you have asked for it. Searchable and keyboard-first.
 * ui-sensibility.md §2.6, §10.
 */
export function AddSpecies({ teamId }: { readonly teamId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<readonly Match[]>([])
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/species?q=${encodeURIComponent(query)}`, { signal: controller.signal })
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
      <Button variant="primary" onClick={() => setOpen(true)}>
        Add a Pokémon
      </Button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        placeholder="Search species"
        aria-label="Search species"
        className="raised w-full px-2 py-1 text-xs outline-none"
      />

      <ul className="max-h-40 overflow-y-auto">
        {matches.map((match) => (
          <li key={match.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await addSpeciesAction(teamId, match.id, 50)
                  setOpen(false)
                  setQuery('')
                })
              }
              className="flex w-full items-center gap-1.5 px-1 py-0.5 text-left text-[0.6875rem] hover:bg-well disabled:opacity-40"
            >
              <Image
                src={spriteUrl(match.spriteKey)}
                alt=""
                width={20}
                height={20}
                className="size-5 shrink-0 object-contain [image-rendering:pixelated]"
                unoptimized
              />
              <span className="truncate">{match.name}</span>
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-1 py-1 text-[0.6875rem] text-text-faint">No species match.</li>
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
