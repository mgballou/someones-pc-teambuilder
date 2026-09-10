/**
 * Fixed-point modifier arithmetic.
 *
 * Every multiplier in the Gen 9 damage chain is an integer over 4096. Working
 * in floats and rounding at the end gives a different answer from the games in
 * roughly one roll in eight, which is the difference between "survives" and
 * "does not". Nothing in this directory multiplies by 1.3.
 */

/** The denominator every modifier is expressed over. */
export const MOD_DENOMINATOR = 4096

/** A modifier that changes nothing. */
export const MOD_ONE = 4096

export const MOD_HALF = 2048
export const MOD_THREE_QUARTERS = 3072
export const MOD_ONE_AND_A_HALF = 6144
export const MOD_DOUBLE = 8192

/**
 * Round to nearest, ties going *down*.
 *
 * The games' rounding, and not `Math.round`. `Math.round(91.5)` is 92; the
 * games give 91, and Life Orb Garchomp's rolls are wrong by one all the way
 * down the array if you use the wrong one.
 */
export function pokeRound(value: number): number {
  return value % 1 > 0.5 ? Math.ceil(value) : Math.floor(value)
}

/** Apply one 4096-denominator modifier to a value. */
export function applyModifier(value: number, modifier: number): number {
  return pokeRound((value * modifier) / MOD_DENOMINATOR)
}

/**
 * Round to nearest, ties going *up*.
 *
 * The chain rounds the other way from `pokeRound`, and the two are not
 * interchangeable. The games combine modifiers with `(a * b + 0x800) >> 12`,
 * which adds half a unit before truncating and so sends a tie upwards.
 * `chain(2048, 4915)` — any screen or Multiscale followed by an Expert Belt —
 * is 2457 under the wrong rounding and 2458 under this one, and it is one of
 * eleven pairs the tables in this directory can already produce.
 *
 * The shift is written as a divide because `chained * modifier` passes 2^31
 * once seven doubling modifiers are on the chain, where `>>` wraps and the
 * reference implementation returns its lower bound.
 */
function chainRound(product: number): number {
  return Math.floor((product + MOD_DENOMINATOR / 2) / MOD_DENOMINATOR)
}

/**
 * Combine modifiers the way the games do: multiply into a running product,
 * rounding at each step, and apply the product once. Applying each modifier to
 * the value in turn is a different — and wrong — number.
 */
export function chainModifiers(modifiers: readonly (number | null)[]): number {
  return modifiers.reduce<number>(
    (chained, modifier) => (modifier === null ? chained : chainRound(chained * modifier)),
    MOD_ONE,
  )
}

/**
 * Turn a dataset ratio into a modifier. Truncating rather than rounding is
 * deliberate: 1.2x is 4915/4096 in the games, not 4915.2 rounded to 4915 by
 * luck, and 1.1x is 4505, not 4506.
 */
export function modifierFromRatio(ratio: number): number {
  return Math.floor(ratio * MOD_DENOMINATOR)
}
