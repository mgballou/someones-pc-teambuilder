import type { MoveId } from '../ids'
import type { PokemonType, TeraType } from '../pokemon-type'
import { effectivenessOf } from '../pokemon-type'

/**
 * Type effectiveness for a move, which is not the same question as type
 * effectiveness for a type.
 *
 * `effectivenessOf` in `pokemon-type.ts` is the chart and only the chart. A
 * handful of moves are read against the chart differently — Freeze-Dry hits
 * Water for 2x, Flying Press is read as Fighting and Flying at once — and
 * asking the chart about them gets an answer that is confidently wrong. Every
 * such rule lives in the table below, so the next one is a line of data rather
 * than a branch somewhere in the calculator.
 */

export type TypeReading =
  /** The chart's answer against one defending type is replaced outright. */
  | { readonly kind: 'against'; readonly type: PokemonType; readonly effectiveness: number }
  /** The move is read as a second attacking type as well, and the two multiply. */
  | { readonly kind: 'also-as'; readonly type: PokemonType }

/** Keyed by the dataset's move slug, the way the ability registry is. */
export const MOVE_TYPE_READINGS: Readonly<Record<string, readonly TypeReading[]>> = {
  'freeze-dry': [{ kind: 'against', type: 'water', effectiveness: 2 }],
  'flying-press': [{ kind: 'also-as', type: 'flying' }],
}

export function typeReadings(id: MoveId | string): readonly TypeReading[] {
  return MOVE_TYPE_READINGS[id] ?? []
}

/** One move against one defending type. */
export function readingAgainst(
  readings: readonly TypeReading[],
  moveType: TeraType,
  defending: PokemonType,
): number {
  for (const reading of readings) {
    if (reading.kind === 'against' && reading.type === defending) return reading.effectiveness
  }

  return readings.reduce(
    (total, reading) =>
      reading.kind === 'also-as' ? total * effectivenessOf(reading.type, defending) : total,
    effectivenessOf(moveType, defending),
  )
}

export type MoveEffectivenessInput = {
  readonly moveId: MoveId
  /** The type the move is actually dealing, after Tera Blast and the masks. */
  readonly moveType: TeraType
  readonly defenderTypes: readonly PokemonType[]
  readonly defenderTerastallized: boolean
}

/**
 * The whole type multiplier for one hit.
 *
 * Stellar is not on the chart: it hits a Terastallized target for 2x and
 * everything else for 1x, which is why it is answered before the chart is
 * consulted at all.
 */
export function moveEffectiveness({
  moveId,
  moveType,
  defenderTypes,
  defenderTerastallized,
}: MoveEffectivenessInput): number {
  if (moveType === 'stellar') return defenderTerastallized ? 2 : 1
  const readings = typeReadings(moveId)
  return defenderTypes.reduce((total, type) => total * readingAgainst(readings, moveType, type), 1)
}
