'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

/**
 * The toggle writes `data-theme` on the root, which wins over
 * `prefers-color-scheme` in both directions. ui-sensibility.md §4.5.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('spc-theme')
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored)
      return
    }
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }, [])

  function choose(next: Theme) {
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('spc-theme', next)
  }

  return (
    <button
      type="button"
      onClick={() => choose(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-box border border-line p-1.5 text-text-dim hover:bg-well hover:text-text"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
        <path
          d="M8 1v14M8 1a7 7 0 000 14"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </button>
  )
}
