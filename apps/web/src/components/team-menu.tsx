'use client'

import { useState, useTransition } from 'react'
import { cloneTeamAction, deleteTeamAction, renameTeamAction } from '../actions/teams'
import { Button } from './button'

/**
 * Deleting a team is the one irreversible act in the app, so it confirms once
 * and names the team. Everything else here is reversible and does not.
 * ui-sensibility.md §2.8.
 */
export function TeamMenu({
  teamId,
  teamName,
}: {
  readonly teamId: string
  readonly teamName: string
}) {
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()

  if (renaming) {
    return (
      <form
        action={(formData) => {
          const next = String(formData.get('name') ?? '').trim()
          if (next.length > 0) {
            start(async () => {
              await renameTeamAction(teamId, next)
              setRenaming(false)
            })
          }
        }}
        className="flex items-center gap-1"
      >
        <input
          name="name"
          defaultValue={teamName}
          autoFocus
          maxLength={80}
          className="well px-2 py-1 text-xs outline-none"
        />
        <Button type="submit" variant="primary" disabled={pending}>
          Save
        </Button>
        <Button type="button" onClick={() => setRenaming(false)}>
          Cancel
        </Button>
      </form>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-dim">Delete “{teamName}” permanently?</span>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => start(() => void deleteTeamAction(teamId))}
        >
          Delete
        </Button>
        <Button onClick={() => setConfirming(false)}>Keep</Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Button onClick={() => setRenaming(true)}>Rename</Button>
      <Button
        disabled={pending}
        onClick={() => start(() => void cloneTeamAction(teamId, `${teamName} copy`))}
      >
        Clone
      </Button>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    </div>
  )
}
