'use client'

import { useEffect } from 'react'

/**
 * A failure names what happened and offers the one thing to do about it. It
 * never discards work — nothing on this page holds unsaved state, because the
 * editor keeps its draft locally until Save. ui-sensibility.md §2.7, §8.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-base font-semibold">That did not load</h1>
      <p className="mt-2 text-xs text-text-dim">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-box bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink"
      >
        Try again
      </button>
    </div>
  )
}
