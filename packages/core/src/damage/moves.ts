import type { PokemonType, TeraType } from '../pokemon-type'
import type { BoostableStat } from '../stats'

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
  /**
   * The move's type is a property of the form holding it. Ivy Cudgel is the
   * mask Ogerpon is wearing; Raging Bull is the breed of Tauros. Keyed by
   * species id, and any form absent from the table keeps the dataset's type.
   */
  readonly typeFromSpecies?: Readonly<Record<string, PokemonType>>
  /** Tera Blast is 100 rather than 80 once the user's Tera type is Stellar. */
  readonly basePowerFromTera?: Readonly<Partial<Record<TeraType, number>>>
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
  'tera-blast': {
    typeFromTera: true,
    categoryFromStats: true,
    basePowerFromTera: { stellar: 100 },
  },
  'tera-starstorm': { typeFromTera: true, categoryFromStats: true },
  'ivy-cudgel': {
    typeFromSpecies: {
      'ogerpon-wellspring-mask': 'water',
      'ogerpon-hearthflame-mask': 'fire',
      'ogerpon-cornerstone-mask': 'rock',
    },
  },
  'raging-bull': {
    typeFromSpecies: {
      'tauros-paldea-combat-breed': 'fighting',
      'tauros-paldea-blaze-breed': 'fire',
      'tauros-paldea-aqua-breed': 'water',
    },
  },
  facade: { ignoresBurn: true },
  earthquake: { halvedByGrassyTerrain: true },
  bulldoze: { halvedByGrassyTerrain: true },
  magnitude: { halvedByGrassyTerrain: true },
}

export function moveOverride(id: string): MoveOverride | null {
  return MOVE_OVERRIDES[id] ?? null
}
