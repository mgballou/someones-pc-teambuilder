import type { BoostableStat } from '../stats.js'

/**
 * The handful of moves whose place in the formula is not read off the dataset.
 *
 * Kept as a table rather than a chain of `if (move.id === ...)` for the same
 * reason the ability registry is: adding Psystrike must be one line of data.
 */
export type MoveOverride = {
  /** Body Press attacks with Def. */
  readonly attackStat?: BoostableStat
  /** Psyshock and its kin hit the physical side. */
  readonly defenseStat?: BoostableStat
  /** Tera Blast takes the user's Tera type once Terastallized. */
  readonly typeFromTera?: boolean
  /** Tera Blast picks its category from the user's higher attacking stat. */
  readonly categoryFromStats?: boolean
  /** Facade is not halved by burn. */
  readonly ignoresBurn?: boolean
  /** Earthquake and friends are halved on Grassy Terrain. */
  readonly halvedByGrassyTerrain?: boolean
}

export const MOVE_OVERRIDES: Readonly<Record<string, MoveOverride>> = {
  'body-press': { attackStat: 'def' },
  psyshock: { defenseStat: 'def' },
  psystrike: { defenseStat: 'def' },
  'secret-sword': { defenseStat: 'def' },
  'tera-blast': { typeFromTera: true, categoryFromStats: true },
  'tera-starstorm': { typeFromTera: true, categoryFromStats: true },
  facade: { ignoresBurn: true },
  earthquake: { halvedByGrassyTerrain: true },
  bulldoze: { halvedByGrassyTerrain: true },
  magnitude: { halvedByGrassyTerrain: true },
}

export function moveOverride(id: string): MoveOverride | null {
  return MOVE_OVERRIDES[id] ?? null
}
