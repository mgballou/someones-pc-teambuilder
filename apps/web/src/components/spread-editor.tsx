'use client'

import type { Nature, Stat, StatSpread } from '@spc/core'
import {
  BOOSTABLE_STATS,
  MAX_EV_PER_STAT,
  MAX_EV_TOTAL,
  MAX_IV,
  STAT_LABEL,
  STATS,
  computeHp,
  computeStat,
  natureMultiplier,
} from '@spc/core'

/**
 * The most-used control in the app. §10.
 *
 * Six rows, a slider and a number field per stat, EVs remaining always
 * visible, and the resulting stat value updating live beside each row. The
 * nature's ×1.1 and ×0.9 are marked on the rows they affect, because a spread
 * you cannot read the consequence of is a spread you have to compute in your
 * head.
 */

export type SpreadEditorProps = {
  readonly baseStats: StatSpread
  readonly evs: StatSpread
  readonly ivs: StatSpread
  readonly nature: Nature
  readonly level: number
  readonly onChange: (next: { readonly evs: StatSpread; readonly ivs: StatSpread }) => void
}

export function SpreadEditor({
  baseStats,
  evs,
  ivs,
  nature,
  level,
  onChange,
}: SpreadEditorProps) {
  const used = STATS.reduce((sum, stat) => sum + evs[stat], 0)
  const remaining = MAX_EV_TOTAL - used
  const over = remaining < 0

  function setEv(stat: Stat, value: number) {
    onChange({ evs: { ...evs, [stat]: clamp(value, 0, MAX_EV_PER_STAT) }, ivs })
  }

  function setIv(stat: Stat, value: number) {
    onChange({ evs, ivs: { ...ivs, [stat]: clamp(value, 0, MAX_IV) } })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-text-dim">EVs remaining</span>
        <span
          className="num text-sm font-semibold"
          style={{ color: over ? 'var(--danger)' : remaining === 0 ? 'var(--ok)' : 'var(--text)' }}
        >
          {remaining}
        </span>
        {over && (
          <span className="text-[0.6875rem]" style={{ color: 'var(--danger)' }}>
            Over the {MAX_EV_TOTAL} cap.
          </span>
        )}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-faint">
            <th className="w-10 py-1 text-left font-medium">Stat</th>
            <th className="w-10 py-1 text-right font-medium">Base</th>
            <th className="py-1 text-left font-medium">EVs</th>
            <th className="w-14 py-1 text-right font-medium">EV</th>
            <th className="w-12 py-1 text-right font-medium">IV</th>
            <th className="w-14 py-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {STATS.map((stat) => {
            const multiplier = natureMultiplier(nature, stat)
            const total =
              stat === 'hp'
                ? computeHp({ base: baseStats.hp, iv: ivs.hp, ev: evs.hp, level })
                : computeStat(
                    { base: baseStats[stat], iv: ivs[stat], ev: evs[stat], level },
                    nature,
                    stat,
                  )

            return (
              <tr key={stat} className="border-t border-line">
                <th className="py-1 text-left font-medium">
                  {STAT_LABEL[stat]}
                  {multiplier > 1 && (
                    <span className="ml-0.5" style={{ color: 'var(--ok)' }} title="Nature ×1.1">
                      +
                    </span>
                  )}
                  {multiplier < 1 && (
                    <span
                      className="ml-0.5"
                      style={{ color: 'var(--danger)' }}
                      title="Nature ×0.9"
                    >
                      −
                    </span>
                  )}
                </th>
                <td className="num py-1 pr-2 text-right text-text-faint">{baseStats[stat]}</td>
                <td className="py-1 pr-2">
                  <input
                    type="range"
                    min={0}
                    max={MAX_EV_PER_STAT}
                    step={4}
                    value={evs[stat]}
                    onChange={(event) => setEv(stat, Number(event.target.value))}
                    aria-label={`${STAT_LABEL[stat]} EVs`}
                    className="w-full accent-[var(--accent)]"
                  />
                </td>
                <td className="py-1">
                  <NumberField
                    value={evs[stat]}
                    max={MAX_EV_PER_STAT}
                    label={`${STAT_LABEL[stat]} EV value`}
                    onCommit={(value) => setEv(stat, value)}
                  />
                </td>
                <td className="py-1">
                  <NumberField
                    value={ivs[stat]}
                    max={MAX_IV}
                    label={`${STAT_LABEL[stat]} IV value`}
                    onCommit={(value) => setIv(stat, value)}
                  />
                </td>
                <td className="num py-1 text-right font-semibold">{total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * A number field accepts typing and never fights the cursor: no reformatting
 * mid-entry, no clamping until blur. §10.
 */
function NumberField({
  value,
  max,
  label,
  onCommit,
}: {
  readonly value: number
  readonly max: number
  readonly label: string
  readonly onCommit: (value: number) => void
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      defaultValue={value}
      key={value}
      aria-label={label}
      onBlur={(event) => onCommit(clamp(Number(event.target.value), 0, max))}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      className="num well w-full px-1 py-0.5 text-right outline-none"
    />
  )
}

function clamp(value: number, low: number, high: number): number {
  if (Number.isNaN(value)) return low
  return Math.max(low, Math.min(high, Math.round(value)))
}

export { BOOSTABLE_STATS }
