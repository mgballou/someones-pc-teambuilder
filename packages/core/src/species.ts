import type { AbilityId, SpeciesId } from './ids'
import type { PokemonType } from './pokemon-type'
import type { StatSpread } from './stats'

/**
 * A species as the builder needs it — which is a *form*, not a national-dex
 * entry. Landorus-Therian and Landorus-Incarnate are two `Species` values
 * sharing a `dexNumber`, because they have different stats, types and
 * abilities and are separately legal. Treating them as one record is the
 * single most common modelling mistake in a team builder.
 */
export type Species = {
  readonly id: SpeciesId
  readonly name: string
  /** National dex number. Not unique — every form of a species shares it. */
  readonly dexNumber: number
  /** The base species this is a form of, or `id` itself for the base form. */
  readonly baseSpecies: SpeciesId
  /** `null` for a base form, otherwise the form label ("Therian", "Hisui"). */
  readonly formName: string | null
  readonly types: readonly [PokemonType] | readonly [PokemonType, PokemonType]
  readonly baseStats: StatSpread
  /** Regular ability slots, in slot order. May be one or two entries. */
  readonly abilities: readonly AbilityId[]
  /** The hidden ability, when the form has one. */
  readonly hiddenAbility: AbilityId | null
  /** Kilograms. Load-bearing for Low Kick, Grass Knot, Heavy Slam, Heat Crash. */
  readonly weightKg: number
  /** Metres. Only needed for a handful of interactions and for display. */
  readonly heightM: number
  readonly generation: number
  readonly classification: SpeciesClassification
  /** True when the species can still evolve, which is what Eviolite keys on. */
  readonly canEvolve: boolean
  /** Gimmicks this specific form can access. */
  readonly gimmicks: SpeciesGimmicks
  readonly spriteKey: string
}

/**
 * Why a species is restricted, as a fact about the species rather than about
 * any one format. Formats decide what to *do* with these; the dataset only
 * records what is true.
 */
export type SpeciesClassification =
  | 'ordinary'
  | 'legendary'
  | 'mythical'
  | 'sub-legendary'
  | 'restricted'
  | 'paradox'
  | 'ultra-beast'
  | 'mega'
  | 'totem'

export type SpeciesGimmicks = {
  /** Mega stone ids this form can hold to Mega Evolve. Empty for most. */
  readonly megaStones: readonly string[]
  readonly canGigantamax: boolean
  /** False for Terapagos and the Ogerpon forms handled as special cases. */
  readonly canTerastallize: boolean
}

export function displayName(species: Species): string {
  return species.formName === null ? species.name : `${species.name}-${species.formName}`
}

export function isFullyEvolved(species: Species): boolean {
  return !species.canEvolve
}

export function baseStatTotal(species: Species): number {
  const s = species.baseStats
  return s.hp + s.atk + s.def + s.spa + s.spd + s.spe
}
