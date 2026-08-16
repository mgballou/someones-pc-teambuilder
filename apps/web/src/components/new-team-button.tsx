'use client'

import { useRef, useState } from 'react'
import { createTeamAction } from '../actions/teams.js'
import { Button } from './button.js'

export type FormatOption = { readonly id: string; readonly name: string }

/**
 * Adding a team is two decisions in sequence — a name, then a format — not a
 * page. An overlay borrows attention and gives it back. ui-sensibility.md
 * §2.6, §2.9.
 */
export function NewTeamButton({
  formats,
  variant = 'quiet',
}: {
  readonly formats: readonly FormatOption[]
  readonly variant?: 'primary' | 'quiet'
}) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)

  function show() {
    setOpen(true)
    dialog.current?.showModal()
  }

  function hide() {
    dialog.current?.close()
    setOpen(false)
  }

  return (
    <>
      <Button variant={variant} onClick={show}>
        New team
      </Button>

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="panel m-auto w-[min(24rem,calc(100vw-2rem))] p-0 backdrop:bg-black/40"
      >
        {open && (
          <form action={createTeamAction} className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold">New team</h2>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-dim">Name</span>
              <input
                name="name"
                required
                maxLength={80}
                autoFocus
                className="well px-2 py-1.5 text-sm outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-dim">Format</span>
              <select name="formatId" className="well px-2 py-1.5 text-sm outline-none">
                {formats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" onClick={hide}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
