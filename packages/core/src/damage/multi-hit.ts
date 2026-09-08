/**
 * How many times a multi-hit move is calculated at.
 *
 * The old answer was the maximum, which made every Icicle Spear read like five
 * hits and every damage figure on the screen the luckiest one available. That
 * is a choice a calculator is allowed to make, but it has to be the declared
 * one, and "best case" is the wrong default for a tool a player uses to decide
 * whether something survives.
 *
 * So the distribution is modelled where it is known, and the count reported is
 * its likeliest outcome. Where it is not known the maximum stands and the note
 * says the distribution is not modelled — the honesty rules again: naming what
 * is missing beats a number that looks derived and is not.
 */

import type { Move, MultiHit } from '../move'

/** One outcome of a multi-hit move and how often it happens, as a percentage. */
export type HitOdds = {
  readonly hits: number
  readonly percent: number
}

/**
 * A move that hits two to five times rolls once for the count: two hits and
 * three hits are three eighths each, four and five one eighth each. It is the
 * only variable shape in Generation 9 whose distribution is written down here.
 * Population Bomb's one-to-ten is an accuracy check before every hit, which is
 * a different question and is left unmodelled rather than guessed at.
 */
const TWO_TO_FIVE: readonly HitOdds[] = [
  { hits: 2, percent: 35 },
  { hits: 3, percent: 35 },
  { hits: 4, percent: 15 },
  { hits: 5, percent: 15 },
]

const HIT_ODDS: Readonly<Record<string, readonly HitOdds[]>> = {
  '2-5': TWO_TO_FIVE,
}

/** The odds table for a range, or `null` where the distribution is not modelled. */
export function hitOdds(multiHit: MultiHit | null): readonly HitOdds[] | null {
  if (multiHit === null || multiHit.min === multiHit.max) return null
  return HIT_ODDS[`${multiHit.min}-${multiHit.max}`] ?? null
}

/** How often exactly this many hits land, or `null` where it is not modelled. */
export function oddsOf(multiHit: MultiHit | null, hits: number): number | null {
  return hitOdds(multiHit)?.find((odds) => odds.hits === hits)?.percent ?? null
}

/**
 * The likeliest number of hits. Two and three are equally likely on a
 * two-to-five move, and the tie goes to the higher because it is also the side
 * the average of 3.1 falls on.
 */
function likeliestHits(odds: readonly HitOdds[]): number {
  return odds.reduce<HitOdds>((best, entry) => (entry.percent >= best.percent ? entry : best), {
    hits: 0,
    percent: -1,
  }).hits
}

export type HitCountInput = {
  readonly multiHit: MultiHit | null
  /** Skill Link and its kind: every hit lands, so the maximum is not a guess. */
  readonly everyHitLands: boolean
  /** A count the caller asked for, clamped to what the move can do. */
  readonly requested: number | null
}

export function hitCount({ multiHit, everyHitLands, requested }: HitCountInput): number {
  if (multiHit === null) return 1
  if (requested !== null) {
    return Math.min(multiHit.max, Math.max(multiHit.min, Math.floor(requested)))
  }
  if (everyHitLands || multiHit.min === multiHit.max) return multiHit.max
  const odds = hitOdds(multiHit)
  return odds === null ? multiHit.max : likeliestHits(odds)
}

export type MultiHitNoteInput = {
  readonly move: Move
  readonly hits: number
  readonly everyHitLands: boolean
  readonly chosenByCaller: boolean
}

/** What the result says about the count it used. Null when there is nothing to say. */
export function multiHitNote({
  move,
  hits,
  everyHitLands,
  chosenByCaller,
}: MultiHitNoteInput): string | null {
  const multiHit = move.multiHit
  if (multiHit === null || multiHit.min === multiHit.max) return null
  const range = `${multiHit.min} to ${multiHit.max}`
  if (everyHitLands && !chosenByCaller) {
    return `${move.name} was calculated at all ${hits} hits, because the attacker's ability lands every one.`
  }
  const odds = hitOdds(multiHit)
  const chance = odds?.find((entry) => entry.hits === hits)?.percent
  if (odds === null || chance === undefined) {
    return `${move.name} was calculated at ${hits} hits, of a possible ${range}. How often it lands fewer is outside the damage model.`
  }
  const opening = chosenByCaller
    ? `${move.name} was calculated at ${hits} hits, which land ${chance}% of the time.`
    : `${move.name} was calculated at ${hits} hits, the likeliest of ${range}.`
  return `${opening} The odds are ${odds.map((entry) => `${entry.hits} hits ${entry.percent}%`).join(', ')}.`
}
