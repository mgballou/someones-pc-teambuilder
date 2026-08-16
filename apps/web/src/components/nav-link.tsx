'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Current position is always legible. ui-sensibility.md §7.2.
 * The active state is a surface change, never the accent — §4.2.
 */
export function NavLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'rounded-box bg-well px-2.5 py-1 text-xs font-semibold text-text'
          : 'rounded-box px-2.5 py-1 text-xs font-medium text-text-dim hover:bg-well hover:text-text'
      }
    >
      {children}
    </Link>
  )
}
