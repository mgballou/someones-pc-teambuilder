import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * One primary action per region. The accent means *act* and appears once.
 * ui-sensibility.md §3, §4.2.
 */
type Variant = 'primary' | 'quiet' | 'danger'

const STYLES: Readonly<Record<Variant, string>> = {
  primary:
    'bg-accent text-accent-ink border-transparent hover:brightness-105 active:brightness-95 font-semibold',
  quiet: 'border-line text-text hover:bg-well',
  danger: 'border-line text-danger hover:bg-danger-soft',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: Variant
  readonly children: ReactNode
}

export function Button({ variant = 'quiet', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-box border px-2.5 py-1 text-xs transition-[background-color,filter] disabled:pointer-events-none disabled:opacity-50 ${STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
