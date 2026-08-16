/**
 * The walk.
 *
 * Five indexes, then every resource behind them, normalized as it arrives.
 * Abilities, moves and items are independent of each other and of the species
 * walk; species needs the whole `pokemon-species` index in memory first,
 * because `canEvolve` is a question about what evolves *into* something and
 * PokéAPI only answers the other direction.
 *
 * The pokemon payloads are the reason this is written as a stream rather than
 * a fetch-all-then-map. Each one carries a few hundred moves times half a
 * dozen version groups; holding 1,351 of them at once is gigabytes, and
 * normalizing on arrival lets every one become garbage immediately.
 */

import type { Ability, Item, Move, MoveId, Species } from '@spc/core'
import type { LearnsetTable } from '../dataset.js'
import type { PokeApiClient } from '../pokeapi/client.js'
import { mapWithConcurrency } from '../pokeapi/client.js'
import type { PokemonSpeciesResponse } from '../pokeapi/schema.js'
import { IngestError } from '../errors.js'
import { normalizeAbility } from './abilities.js'
import { megaStonesByHolder, normalizeItem } from './items.js'
import { learnsetOf } from './learnsets.js'
import { normalizeMove } from './moves.js'
import { evolvingSpeciesFrom, normalizeSpecies } from './species.js'

export type IngestResult = {
  readonly species: readonly Species[]
  readonly moves: readonly Move[]
  readonly items: readonly Item[]
  readonly abilities: readonly Ability[]
  readonly learnsets: LearnsetTable
}

export type IngestProgress = {
  readonly stage: string
  readonly done: number
  readonly total: number
}

export type IngestOptions = {
  readonly concurrency?: number
  readonly onProgress?: (progress: IngestProgress) => void
}

export async function ingest(
  client: PokeApiClient,
  { concurrency = 8, onProgress }: IngestOptions = {},
): Promise<IngestResult> {
  const report = onProgress ?? (() => undefined)

  const abilities = await walk({
    stage: 'abilities',
    names: await client.abilityIndex(),
    concurrency,
    report,
    fetch: async (name) => normalizeAbility(await client.ability(name)),
  })

  const moves = await walk({
    stage: 'moves',
    names: await client.moveIndex(),
    concurrency,
    report,
    fetch: async (name) => normalizeMove(await client.move(name)),
  })

  const items = await walk({
    stage: 'items',
    names: await client.itemIndex(),
    concurrency,
    report,
    fetch: async (name) => normalizeItem(await client.item(name)),
  })

  const speciesResponses = await walk({
    stage: 'pokemon-species',
    names: await client.speciesIndex(),
    concurrency,
    report,
    fetch: (name) => client.pokemonSpecies(name),
  })

  const speciesByName = new Map<string, PokemonSpeciesResponse>(
    speciesResponses.map((response) => [response.name, response]),
  )
  const evolvingSpecies = evolvingSpeciesFrom(speciesResponses)
  const megaStones = megaStonesByHolder()
  const knownMoves = new Set<string>(moves.map((move) => move.id))

  const forms = await walk({
    stage: 'pokemon',
    names: await client.pokemonIndex(),
    concurrency,
    report,
    fetch: async (name) => {
      const pokemon = await client.pokemon(name)
      const species = speciesByName.get(pokemon.species.name)
      if (species === undefined) throw IngestError.unknownSpecies(name)
      return {
        species: normalizeSpecies({
          pokemon,
          species,
          evolvingSpecies,
          megaStonesByHolder: megaStones,
        }),
        /**
         * Filtered against the move table so the dataset can never hand the
         * calculator a move id it cannot resolve.
         */
        learnset: learnsetOf(pokemon).filter((id) => knownMoves.has(id)),
      }
    },
  })

  return {
    species: forms.map((form) => form.species),
    moves,
    items,
    abilities,
    learnsets: buildLearnsetTable(forms.map((form) => [form.species.id, form.learnset])),
  }
}

type WalkInput<T> = {
  readonly stage: string
  readonly names: readonly string[]
  readonly concurrency: number
  readonly report: (progress: IngestProgress) => void
  readonly fetch: (name: string) => Promise<T>
}

async function walk<T>({ stage, names, concurrency, report, fetch }: WalkInput<T>): Promise<T[]> {
  let done = 0
  report({ stage, done, total: names.length })
  const results = await mapWithConcurrency(names, concurrency, async (name) => {
    const value = await fetch(name)
    done += 1
    if (done % 50 === 0 || done === names.length) report({ stage, done, total: names.length })
    return value
  })
  return results
}

/** Collapse every learnset onto one shared move table. See `LearnsetTable`. */
export function buildLearnsetTable(
  entries: readonly (readonly [string, readonly MoveId[]])[],
): LearnsetTable {
  const offsets = new Map<string, number>()
  const table: string[] = []
  const species: Record<string, readonly number[]> = {}

  for (const [id, learnset] of entries) {
    species[id] = learnset.map((move) => {
      const existing = offsets.get(move)
      if (existing !== undefined) return existing
      const offset = table.length
      table.push(move)
      offsets.set(move, offset)
      return offset
    })
  }

  return { moves: table, species }
}
