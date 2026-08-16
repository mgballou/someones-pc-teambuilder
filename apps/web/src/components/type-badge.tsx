import type { PokemonType, TeraType } from '@spc/core'

/**
 * The one place a type hue may be used, alongside the coverage grid and the
 * Tera indicator. Nothing else in the app borrows these eighteen colors —
 * ui-sensibility.md §4.3.
 *
 * The badge is a tint plus the saturated hue as text, rather than a solid
 * colored block, because that survives both themes at readable contrast
 * without needing a per-hue text color decision.
 */

const LABEL: Readonly<Record<TeraType, string>> = {
  normal: 'Normal',
  fire: 'Fire',
  water: 'Water',
  electric: 'Electric',
  grass: 'Grass',
  ice: 'Ice',
  fighting: 'Fighting',
  poison: 'Poison',
  ground: 'Ground',
  flying: 'Flying',
  psychic: 'Psychic',
  bug: 'Bug',
  rock: 'Rock',
  ghost: 'Ghost',
  dragon: 'Dragon',
  dark: 'Dark',
  steel: 'Steel',
  fairy: 'Fairy',
  stellar: 'Stellar',
}

function hueVar(type: TeraType): string {
  return type === 'stellar' ? 'var(--accent)' : `var(--type-${type})`
}

export type TypeBadgeProps = {
  readonly type: PokemonType
  readonly size?: 'sm' | 'md'
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const hue = hueVar(type)
  return (
    <span
      className={
        size === 'sm'
          ? 'inline-flex items-center rounded-box border px-1.5 py-px text-[0.625rem] font-semibold uppercase tracking-wider'
          : 'inline-flex items-center rounded-box border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider'
      }
      style={{
        color: hue,
        borderColor: `color-mix(in oklab, ${hue} 40%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${hue} 14%, transparent)`,
      }}
    >
      {LABEL[type]}
    </span>
  )
}

export type TeraBadgeProps = {
  readonly type: TeraType
}

/**
 * Deliberately a different shape from a type badge. A Tera type is not a
 * typing — it is a declared intention — and reading one as the other at a
 * glance is the mistake this shape prevents.
 */
export function TeraBadge({ type }: TeraBadgeProps) {
  const hue = hueVar(type)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider"
      style={{
        color: hue,
        borderColor: `color-mix(in oklab, ${hue} 55%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${hue} 10%, transparent)`,
      }}
    >
      <svg viewBox="0 0 10 10" className="size-2" aria-hidden="true">
        <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
      </svg>
      Tera {LABEL[type]}
    </span>
  )
}

export function typeLabel(type: TeraType): string {
  return LABEL[type]
}
