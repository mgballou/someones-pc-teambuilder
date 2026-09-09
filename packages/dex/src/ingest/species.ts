/**
 * One PokéAPI `pokemon` becomes one `Species`.
 *
 * Not one `pokemon-species` — one `pokemon`. Landorus-Therian and
 * Landorus-Incarnate are two records here sharing a dex number, because they
 * have different stats, different types and different abilities, and a builder
 * that folds them together is wrong about the game. `/pokemon` supplies stats,
 * types, abilities and weight; `/pokemon-species` supplies the dex number, the
 * display name, the generation and the legendary flags.
 *
 * Pure. Everything it cannot read off those two payloads — whether a *form*
 * evolves, which mega stones point at it — arrives as an argument.
 */

import type { AbilityId, PokemonType, Species, SpeciesClassification, StatSpread } from '@spc/core'
import { abilityId, isPokemonType, speciesId } from '@spc/core'
import { IngestError } from '../errors'
import type { PokemonResponse, PokemonSpeciesResponse } from '../pokeapi/schema'
import { englishName } from '../pokeapi/schema'
import { availableGenerations } from './availability'
import {
  PARADOX_SPECIES,
  RESTRICTED_SPECIES,
  SUB_LEGENDARY_SPECIES,
  ULTRA_BEAST_SPECIES,
} from './curated/classification'
import { NON_EVOLVING_FORMS, NO_TERASTAL_FORMS } from './curated/species-quirks'
import { generationNumber, statKey, titleCase } from './text'

export type NormalizeSpeciesInput = {
  readonly pokemon: PokemonResponse
  readonly species: PokemonSpeciesResponse
  /**
   * Every `pokemon-species` name that some other species evolves *from*.
   * Membership is what `canEvolve` means, and it is why the ingest never has
   * to walk an evolution chain.
   */
  readonly evolvingSpecies: ReadonlySet<string>
  /** Mega stone item names, keyed by the `pokemon` name that may hold them. */
  readonly megaStonesByHolder: ReadonlyMap<string, readonly string[]>
}

export function normalizeSpecies({
  pokemon,
  species,
  evolvingSpecies,
  megaStonesByHolder,
}: NormalizeSpeciesInput): Species {
  const id = speciesId(pokemon.name)
  const form = formShape(pokemon.name)
  const defaultVariety =
    species.varieties.find((variety) => variety.is_default)?.pokemon.name ?? pokemon.name

  return {
    id,
    name: englishName(species.names) ?? titleCase(species.name),
    dexNumber: species.id,
    baseSpecies: speciesId(defaultVariety),
    formName: formLabel(species.name, pokemon.name),
    types: typesOf(pokemon),
    baseStats: baseStatsOf(pokemon),
    abilities: regularAbilities(pokemon),
    hiddenAbility: hiddenAbility(pokemon),
    weightKg: pokemon.weight / 10,
    heightM: pokemon.height / 10,
    generation: generationNumber(species.generation.name),
    availableIn: availableGenerations(pokemon),
    classification: classify({ species, form }),
    canEvolve: canEvolve({ pokemon, species, form, evolvingSpecies }),
    gimmicks: {
      megaStones: megaStonesByHolder.get(pokemon.name) ?? [],
      canGigantamax: species.varieties.some(
        (variety) => variety.pokemon.name === `${pokemon.name}-gmax`,
      ),
      canTerastallize: !NO_TERASTAL_FORMS.has(pokemon.name) && !form.mega && !form.gigantamax,
    },
    /**
     * The PokéAPI numeric id. Every sprite path is keyed on it, so the render
     * layer can build any of them and the dataset carries no URLs.
     */
    spriteKey: String(pokemon.id),
  }
}

type FormShape = {
  readonly mega: boolean
  readonly gigantamax: boolean
  readonly totem: boolean
}

function formShape(name: string): FormShape {
  return {
    mega: name.includes('-mega'),
    gigantamax: name.endsWith('-gmax'),
    totem: name.includes('-totem'),
  }
}

/** `landorus` + `landorus-therian` -> `Therian`. A base form gets `null`. */
function formLabel(speciesName: string, pokemonName: string): string | null {
  if (pokemonName === speciesName) return null
  if (!pokemonName.startsWith(`${speciesName}-`)) return titleCase(pokemonName)
  return titleCase(pokemonName.slice(speciesName.length + 1))
}

function typesOf(pokemon: PokemonResponse): Species['types'] {
  const types = [...pokemon.types]
    .sort((left, right) => left.slot - right.slot)
    .map((entry) => entry.type.name)
    .filter((name): name is PokemonType => isPokemonType(name))
  const [first, second] = types
  if (first === undefined) throw IngestError.noTypes(pokemon.name)
  return second === undefined ? [first] : [first, second]
}

function baseStatsOf(pokemon: PokemonResponse): StatSpread {
  const spread: Record<string, number> = {}
  for (const entry of pokemon.stats) {
    spread[statKey(pokemon.name, entry.stat.name)] = entry.base_stat
  }
  const { hp, atk, def, spa, spd, spe } = spread
  if (
    hp === undefined ||
    atk === undefined ||
    def === undefined ||
    spa === undefined ||
    spd === undefined ||
    spe === undefined
  ) {
    throw IngestError.missingStat(pokemon.name, 'one of the six')
  }
  return { hp, atk, def, spa, spd, spe }
}

function regularAbilities(pokemon: PokemonResponse): readonly AbilityId[] {
  return [...pokemon.abilities]
    .filter((entry) => !entry.is_hidden)
    .sort((left, right) => left.slot - right.slot)
    .map((entry) => abilityId(entry.ability.name))
}

function hiddenAbility(pokemon: PokemonResponse): AbilityId | null {
  const hidden = [...pokemon.abilities]
    .filter((entry) => entry.is_hidden)
    .sort((left, right) => left.slot - right.slot)[0]
  return hidden === undefined ? null : abilityId(hidden.ability.name)
}

type ClassifyInput = {
  readonly species: PokemonSpeciesResponse
  readonly form: FormShape
}

/**
 * Form beats species; then restricted beats mythical beats paradox beats
 * legendary.
 *
 * The form tests used to sit last, so the base species' answer won.
 * Mewtwo-Mega-Y came out `restricted`, Latios-Mega `sub-legendary` and
 * Diancie-Mega `mythical`. Twelve of the ninety-seven Mega forms were
 * classified as something other than `mega`, a ban list naming `mega` missed
 * all twelve, and four Mega Evolutions were legal in Regulation G.
 *
 * A Mega form's restricted-ness belongs to the species it megas from, and
 * `restrictedSpecies` is a list of ids that has never held a Mega id. Its
 * mega-ness belongs to the form, and is the one fact here about this record
 * rather than about its base.
 */
function classify({ species, form }: ClassifyInput): SpeciesClassification {
  if (form.mega) return 'mega'
  if (form.totem) return 'totem'
  if (RESTRICTED_SPECIES.has(species.name)) return 'restricted'
  if (species.is_mythical) return 'mythical'
  if (PARADOX_SPECIES.has(species.name)) return 'paradox'
  if (ULTRA_BEAST_SPECIES.has(species.name)) return 'ultra-beast'
  if (species.is_legendary) {
    return SUB_LEGENDARY_SPECIES.has(species.name) ? 'sub-legendary' : 'legendary'
  }
  return 'ordinary'
}

type CanEvolveInput = {
  readonly pokemon: PokemonResponse
  readonly species: PokemonSpeciesResponse
  readonly form: FormShape
  readonly evolvingSpecies: ReadonlySet<string>
}

function canEvolve({ pokemon, species, form, evolvingSpecies }: CanEvolveInput): boolean {
  if (form.mega || form.gigantamax || form.totem) return false
  if (NON_EVOLVING_FORMS.has(pokemon.name)) return false
  return evolvingSpecies.has(species.name)
}

/**
 * The set `canEvolve` reads: every species that something else evolves from.
 *
 * PokéAPI answers "what did this evolve from", never "what does this evolve
 * into", so the whole species index is inverted once and the answer becomes a
 * set membership test.
 */
export function evolvingSpeciesFrom(all: readonly PokemonSpeciesResponse[]): ReadonlySet<string> {
  const names = new Set<string>()
  for (const species of all) {
    const from = species.evolves_from_species
    if (from !== null) names.add(from.name)
  }
  return names
}
