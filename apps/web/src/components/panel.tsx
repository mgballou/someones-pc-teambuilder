import type { ReactNode } from 'react'

/**
 * Box chrome. A panel is a face with an edge; depth comes from a line plus one
 * surface step, never a soft shadow. ui-sensibility.md §5.
 *
 * A heading owns a surface, so weight comes from structure rather than from
 * font-size alone. §5, §6.3.
 */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  readonly title?: string
  readonly subtitle?: ReactNode
  readonly action?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <section className={`panel overflow-hidden ${className}`}>
      {title !== undefined && (
        <header className="flex items-center gap-3 border-b border-line bg-well/50 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-dim">{title}</h2>
          {subtitle !== undefined && (
            <span className="truncate text-xs text-text-faint">{subtitle}</span>
          )}
          {action !== undefined && <div className="ml-auto">{action}</div>}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  )
}

/**
 * The honesty strip. Every panel that reports a curated or approximated fact
 * carries one, permanently, next to the verdict rather than in a tooltip.
 * ui-sensibility.md §12.1.
 */
export function SourceNote({ children }: { readonly children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-line pt-2 text-[0.6875rem] leading-relaxed text-text-faint">
      {children}
    </p>
  )
}

export function EmptyState({
  headline,
  children,
}: {
  readonly headline: string
  readonly children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <p className="text-sm text-text-dim">{headline}</p>
      {children}
    </div>
  )
}
