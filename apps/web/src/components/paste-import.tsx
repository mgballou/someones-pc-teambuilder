'use client'

import { useState, useTransition } from 'react'
import { importPasteAction, type ImportResult } from '../actions/import.js'
import { Button } from './button.js'

export function PasteImport({
  teamId,
  formatId,
}: {
  readonly teamId: string
  readonly formatId: string
}) {
  const [paste, setPaste] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={paste}
        onChange={(event) => setPaste(event.target.value)}
        rows={6}
        spellCheck={false}
        placeholder={'Garchomp @ Life Orb\nAbility: Rough Skin\n- Earthquake'}
        aria-label="Showdown paste"
        className="well w-full resize-y px-2 py-1.5 font-mono text-[0.6875rem] leading-relaxed outline-none"
      />

      <Button
        variant="primary"
        disabled={pending || paste.trim().length === 0}
        onClick={() =>
          start(async () => {
            const outcome = await importPasteAction(teamId, formatId, paste)
            setResult(outcome)
            if (outcome.imported > 0) setPaste('')
          })
        }
      >
        {pending ? 'Reading' : 'Import'}
      </Button>

      {result !== null && (
        <div className="flex flex-col gap-1 text-[0.6875rem]">
          <p className="text-text-dim">
            {result.imported === 0
              ? 'Nothing could be read from that paste.'
              : `Imported ${result.imported}.`}
          </p>
          {result.problems.map((problem, index) => (
            <p key={index} style={{ color: 'var(--warn)' }}>
              {problem}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
