import type { Stat, StatSpread } from '@spc/core'
import { STAT_LABEL, STATS } from '@spc/core'

/**
 * One formatter per kind of number, used everywhere.
 *
 * A percentage that renders `56.3%` in one panel and `56%` in another is a
 * bug, and the only way to prevent it is for there to be exactly one function
 * that can produce it. ui-sensibility.md §6.2.
 */

/** `252 Atk / 4 Def / 252 Spe` — non-zero stats only, canonical order. */
export function formatEvLine(evs: StatSpread): string {
  const parts = STATS.filter((stat) => evs[stat] > 0).map(
    (stat) => `${evs[stat]} ${STAT_LABEL[stat]}`,
  )
  return parts.length === 0 ? 'No EVs' : parts.join(' / ')
}

/** `0 Atk / 30 Spe` — only stats below 31, which is the interesting case. */
export function formatIvLine(ivs: StatSpread): string {
  const parts = STATS.filter((stat) => ivs[stat] < 31).map(
    (stat) => `${ivs[stat]} ${STAT_LABEL[stat]}`,
  )
  return parts.length === 0 ? '' : parts.join(' / ')
}

/** `168 – 198` with a true en dash, for a damage range. */
export function formatRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min} – ${max}`
}

/** `56.3% – 66.4%`, always one decimal place so columns align. */
export function formatPercentRange(min: number, max: number): string {
  return `${min.toFixed(1)}% – ${max.toFixed(1)}%`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/** `×2`, `×½`, `×¼`, `×0` — the multiplier as competitive players write it. */
export function formatEffectiveness(multiplier: number): string {
  switch (multiplier) {
    case 0:
      return '×0'
    case 0.25:
      return '×¼'
    case 0.5:
      return '×½'
    case 1:
      return '×1'
    case 2:
      return '×2'
    case 4:
      return '×4'
    default:
      return `×${multiplier}`
  }
}

/** `4 of 6`. Never "4/6", never "4 out of 6". */
export function formatCount(current: number, total: number): string {
  return `${current} of ${total}`
}

export function formatStatLabel(stat: Stat): string {
  return STAT_LABEL[stat]
}

/** Title case from a slug: `great-tusk` becomes `Great Tusk`. */
export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
