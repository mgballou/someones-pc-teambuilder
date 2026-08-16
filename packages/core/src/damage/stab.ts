import type { PokemonType, TeraType } from '../pokemon-type'
import { MOD_DOUBLE, MOD_ONE, MOD_ONE_AND_A_HALF } from './modifier'

/** 2.25x — Adaptability on a Tera type that was already one of the originals. */
const MOD_ADAPTABLE_TERA = 9216

/** 1.2x — what Stellar gives a move whose type the user never had. */
const MOD_STELLAR_OFF_TYPE = 4915

export type StabInput = {
  readonly moveType: TeraType
  readonly originalTypes: readonly PokemonType[]
  readonly teraType: TeraType | null
  readonly terastallized: boolean
  readonly adaptability: boolean
}

function matches(types: readonly PokemonType[], type: TeraType): boolean {
  return types.some((candidate) => candidate === type)
}

/**
 * The Gen 9 same-type bonus, as a 4096-denominator modifier.
 *
 * Terastallizing never *removes* the bonus from an original type, and stacking
 * a Tera type onto an original type is the only way to reach 2x without
 * Adaptability. Getting this wrong is the most common bug in a Gen 9 calc, so
 * every one of the five cases is written out rather than derived.
 */
export function stabModifier({
  moveType,
  originalTypes,
  teraType,
  terastallized,
  adaptability,
}: StabInput): number {
  const original = matches(originalTypes, moveType)
  const active = terastallized && teraType !== null

  if (active && teraType === 'stellar') {
    return original ? MOD_DOUBLE : MOD_STELLAR_OFF_TYPE
  }

  if (!active) {
    if (!original) return MOD_ONE
    return adaptability ? MOD_DOUBLE : MOD_ONE_AND_A_HALF
  }

  const tera = teraType === moveType

  if (tera && original) return adaptability ? MOD_ADAPTABLE_TERA : MOD_DOUBLE
  if (tera || original) return adaptability ? MOD_DOUBLE : MOD_ONE_AND_A_HALF
  return MOD_ONE
}
