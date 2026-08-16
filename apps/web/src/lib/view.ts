import type { PokemonSet, PokemonType, SetId, StatSpread, TeraType } from '@spc/core'

/**
 * View models.
 *
 * A component never reaches into the dex. Pages resolve ids into these plain
 * shapes on the server and hand them down, so every component below is a pure
 * function of its props and can be rendered in a test with an object literal.
 */

export type MoveView = {
  readonly id: string
  readonly name: string
  readonly type: PokemonType
  readonly category: 'physical' | 'special' | 'status'
  readonly basePower: number
  readonly accuracy: number | null
}

export type SetView = {
  readonly id: SetId
  readonly set: PokemonSet
  readonly speciesName: string
  readonly dexNumber: number
  readonly types: readonly PokemonType[]
  readonly spriteUrl: string
  readonly abilityName: string | null
  readonly itemName: string | null
  readonly teraType: TeraType | null
  /** Final computed stats at the set's level, already through the formula. */
  readonly stats: StatSpread
  readonly baseStats: StatSpread
  readonly moves: readonly (MoveView | null)[]
  /** Populated when the set breaks a rule of the team's format. */
  readonly problems: readonly string[]
}

export type TeamHeaderView = {
  readonly id: string
  readonly name: string
  readonly formatId: string
  readonly formatName: string
  readonly formatShortName: string
  readonly teamSize: number
  readonly memberCount: number
  readonly violationCount: number
  readonly sharedWeaknessCount: number
}
