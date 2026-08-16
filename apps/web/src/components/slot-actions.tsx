'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  copySetAction,
  deleteSetAction,
  duplicateSetAction,
  moveSetAction,
  reorderAction,
  saveToBoxAction,
} from '../actions/teams'

export type OtherTeam = { readonly id: string; readonly name: string }

/**
 * The manipulation loop: duplicate in place, move or copy to another team,
 * save to the Box, reorder. Reordering has a keyboard control on every slot
 * because drag is an accelerant, never the only path. ui-sensibility.md
 * §2.4, §2.11.
 */
export function SlotActions({
  teamId,
  setId,
  index,
  lastIndex,
  otherTeams,
  order,
}: {
  readonly teamId: string
  readonly setId: string
  readonly index: number
  readonly lastIndex: number
  readonly otherTeams: readonly OtherTeam[]
  readonly order: readonly string[]
}) {
  const [pending, start] = useTransition()
  const [transferring, setTransferring] = useState<'move' | 'copy' | null>(null)
  const [confirming, setConfirming] = useState(false)

  function shift(direction: -1 | 1) {
    const next = [...order]
    const target = index + direction
    const a = next[index]
    const b = next[target]
    if (a === undefined || b === undefined) return
    next[index] = b
    next[target] = a
    start(() => void reorderAction(teamId, next))
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 border-t border-line pt-2 text-xs">
        <span className="text-text-dim">Remove?</span>
        <IconButton
          label="Confirm remove"
          tone="danger"
          disabled={pending}
          onClick={() => start(() => void deleteSetAction(teamId, setId))}
        >
          Remove
        </IconButton>
        <IconButton label="Keep" onClick={() => setConfirming(false)}>
          Keep
        </IconButton>
      </div>
    )
  }

  if (transferring !== null) {
    return (
      <div className="flex flex-col gap-1 border-t border-line pt-2">
        <span className="text-[0.6875rem] text-text-dim">
          {transferring === 'move' ? 'Move to' : 'Copy to'}
        </span>
        {otherTeams.length === 0 ? (
          <span className="text-[0.6875rem] text-text-faint">No other teams yet.</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {otherTeams.map((team) => (
              <IconButton
                key={team.id}
                label={`${transferring} to ${team.name}`}
                disabled={pending}
                onClick={() =>
                  start(() =>
                    transferring === 'move'
                      ? void moveSetAction(setId, team.id)
                      : void copySetAction(setId, team.id),
                  )
                }
              >
                {team.name}
              </IconButton>
            ))}
          </div>
        )}
        <IconButton label="Cancel" onClick={() => setTransferring(null)}>
          Cancel
        </IconButton>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-line pt-2">
      <Link
        href={`/teams/${teamId}/sets/${setId}`}
        className="rounded-box bg-accent px-1.5 py-0.5 text-[0.6875rem] font-semibold text-accent-ink"
      >
        Edit
      </Link>
      <IconButton
        label="Move up one slot"
        disabled={pending || index === 0}
        onClick={() => shift(-1)}
      >
        ↑
      </IconButton>
      <IconButton
        label="Move down one slot"
        disabled={pending || index === lastIndex}
        onClick={() => shift(1)}
      >
        ↓
      </IconButton>
      <IconButton
        label="Duplicate this set"
        disabled={pending}
        onClick={() => start(() => void duplicateSetAction(teamId, setId))}
      >
        Duplicate
      </IconButton>
      <IconButton
        label="Save to the Box"
        disabled={pending}
        onClick={() => start(() => void saveToBoxAction(setId))}
      >
        To Box
      </IconButton>
      <IconButton label="Move to another team" onClick={() => setTransferring('move')}>
        Move
      </IconButton>
      <IconButton label="Copy to another team" onClick={() => setTransferring('copy')}>
        Copy
      </IconButton>
      <IconButton label="Remove from team" tone="danger" onClick={() => setConfirming(true)}>
        ✕
      </IconButton>
    </div>
  )
}

function IconButton({
  label,
  tone,
  disabled,
  onClick,
  children,
}: {
  readonly label: string
  readonly tone?: 'danger'
  readonly disabled?: boolean
  readonly onClick?: () => void
  readonly children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-box border border-line px-1.5 py-0.5 text-[0.6875rem] hover:bg-well disabled:pointer-events-none disabled:opacity-40"
      style={tone === 'danger' ? { color: 'var(--danger)' } : undefined}
    >
      {children}
    </button>
  )
}
