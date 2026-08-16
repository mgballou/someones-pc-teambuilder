import { formatEffectiveness } from '../lib/format.js'

/**
 * A diverging scale that is never the type hues and never the accent, and that
 * always carries a non-color channel — the multiplier is printed in the cell.
 * Nobody reads a red-green grid the same way. ui-sensibility.md §4.4.
 */
function tokenFor(multiplier: number): string {
  if (multiplier === 0) return 'var(--eff-immune)'
  if (multiplier <= 0.25) return 'var(--eff-quarter)'
  if (multiplier < 1) return 'var(--eff-half)'
  if (multiplier === 1) return 'var(--eff-neutral)'
  if (multiplier < 4) return 'var(--eff-double)'
  return 'var(--eff-quad)'
}

export function EffectivenessCell({ multiplier }: { readonly multiplier: number }) {
  const neutral = multiplier === 1
  const hue = tokenFor(multiplier)

  return (
    <td className="p-px">
      <span
        className="num flex h-6 min-w-[1.75rem] items-center justify-center rounded-[2px] text-[0.625rem] font-semibold"
        style={
          neutral
            ? { color: 'var(--text-faint)' }
            : {
                color: hue,
                backgroundColor: `color-mix(in oklab, ${hue} 16%, transparent)`,
              }
        }
        title={formatEffectiveness(multiplier)}
      >
        {neutral ? '·' : formatEffectiveness(multiplier).replace('×', '')}
      </span>
    </td>
  )
}
