'use client'

import { useState, useTransition } from 'react'
import { deleteBoxSetAction, pullFromBoxAction } from '../actions/teams'

export function BoxEntryActions({
  setId,
  teams,
}: {
  readonly setId: string
  readonly teams: readonly { readonly id: string; readonly name: string }[]
}) {
  const [choosing, setChoosing] = useState(false)
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-line pt-2">
      {choosing ? (
        <>
          {teams.length === 0 ? (
            <span className="text-[0.6875rem] text-text-faint">No teams yet.</span>
          ) : (
            teams.map((team) => (
              <button
                key={team.id}
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await pullFromBoxAction(setId, team.id)
                    setChoosing(false)
                  })
                }
                className="rounded-box border border-line px-1.5 py-0.5 text-[0.6875rem] hover:bg-well disabled:opacity-40"
              >
                {team.name}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => setChoosing(false)}
            className="text-[0.6875rem] text-text-faint underline underline-offset-2"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setChoosing(true)}
            className="rounded-box border border-line px-1.5 py-0.5 text-[0.6875rem] hover:bg-well"
          >
            Add to team
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => void deleteBoxSetAction(setId))}
            aria-label="Delete from the Box"
            className="ml-auto rounded-box border border-line px-1.5 py-0.5 text-[0.6875rem] disabled:opacity-40"
            style={{ color: 'var(--danger)' }}
          >
            ✕
          </button>
        </>
      )}
    </div>
  )
}
