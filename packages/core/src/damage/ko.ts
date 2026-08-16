import type { KoChance } from './types.js'

export type KoInput = {
  /** The sixteen rolls, ascending. */
  readonly rolls: readonly number[]
  readonly currentHp: number
}

function label(hits: number): string {
  return hits === 1 ? 'OHKO' : `${hits}HKO`
}

/**
 * How many hits this takes, and on how many of the sixteen rolls.
 *
 * Residual damage, recovery and Focus Sash are all outside this: it is the
 * repeated application of one move against a target that does nothing back.
 * The result's notes say so whenever the defender holds something that would
 * change the answer.
 */
export function koChance({ rolls, currentHp }: KoInput): KoChance {
  const min = rolls[0] ?? 0
  const max = rolls[rolls.length - 1] ?? 0

  if (max <= 0) return { kind: 'none', summary: 'no damage, no KO' }

  const hitsFor = (damage: number): number =>
    damage <= 0 ? Number.POSITIVE_INFINITY : Math.ceil(currentHp / damage)

  const fastest = hitsFor(max)
  const slowest = hitsFor(min)

  if (fastest === slowest) {
    return { kind: 'guaranteed', hits: fastest, summary: `guaranteed ${label(fastest)}` }
  }

  const atFastest = rolls.filter((damage) => hitsFor(damage) === fastest).length

  return {
    kind: 'chance',
    hits: fastest,
    rolls: atFastest,
    worstCaseHits: slowest,
    summary: `${atFastest} of ${rolls.length} rolls to ${label(fastest)}, otherwise ${label(slowest)}`,
  }
}
