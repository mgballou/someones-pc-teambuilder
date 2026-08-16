/**
 * The zod boundary.
 *
 * Every byte that arrives from PokéAPI is validated here and nowhere else.
 * Downstream code takes the inferred types and trusts them — re-checking a
 * shape after this point is the anti-pattern named in CLAUDE.md.
 *
 * The schemas are deliberately *narrow*: they declare only the fields the
 * ingest reads, and zod strips the rest. A `/pokemon` payload is around a
 * hundred kilobytes of sprites, game indices and flavour text, and holding
 * 1,351 of those in memory at once is the difference between an ingest that
 * finishes and one that does not.
 */

import { z } from 'zod'

/** `{ name, url }` all over PokéAPI. Only the name is ever a stable key. */
const namedResource = z.object({ name: z.string() })

const englishEntry = z.object({
  name: z.string(),
  language: namedResource,
})

/** A paginated index. Every index the ingest asks for is fetched unpaginated. */
export const resourceListSchema = z.object({
  count: z.number(),
  results: z.array(namedResource),
})

export type ResourceList = z.infer<typeof resourceListSchema>

// ---------------------------------------------------------------------------
// /pokemon/{name} — one *form*. This is what becomes a `Species`.
// ---------------------------------------------------------------------------

export const pokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_default: z.boolean(),
  /** Decimetres. */
  height: z.number(),
  /** Hectograms. */
  weight: z.number(),
  species: namedResource,
  types: z.array(z.object({ slot: z.number(), type: namedResource })),
  abilities: z.array(
    z.object({ slot: z.number(), is_hidden: z.boolean(), ability: namedResource }),
  ),
  stats: z.array(z.object({ base_stat: z.number(), stat: namedResource })),
  moves: z.array(
    z.object({
      move: namedResource,
      version_group_details: z.array(z.object({ version_group: namedResource })),
    }),
  ),
})

export type PokemonResponse = z.infer<typeof pokemonSchema>

// ---------------------------------------------------------------------------
// /pokemon-species/{name} — the dex entry a family of forms shares.
// ---------------------------------------------------------------------------

export const pokemonSpeciesSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  generation: namedResource,
  evolves_from_species: namedResource.nullable(),
  varieties: z.array(z.object({ is_default: z.boolean(), pokemon: namedResource })),
  names: z.array(englishEntry),
})

export type PokemonSpeciesResponse = z.infer<typeof pokemonSpeciesSchema>

// ---------------------------------------------------------------------------
// /move/{name}
// ---------------------------------------------------------------------------

/**
 * Every target PokéAPI knows about. Listed as a closed enum on purpose: a
 * target this codebase has never seen must fail loudly at the boundary rather
 * than fall through a `??` into "selected-target" and quietly cost someone a
 * spread reduction.
 */
export const POKEAPI_MOVE_TARGETS = [
  'specific-move',
  'selected-pokemon-me-first',
  'ally',
  'users-field',
  'user-or-ally',
  'opponents-field',
  'user',
  'random-opponent',
  'all-other-pokemon',
  'selected-pokemon',
  'all-opponents',
  'entire-field',
  'user-and-allies',
  'all-pokemon',
  'all-allies',
  'fainting-pokemon',
] as const

export type PokeApiMoveTarget = (typeof POKEAPI_MOVE_TARGETS)[number]

export const MOVE_DAMAGE_CLASSES = ['physical', 'special', 'status'] as const

/**
 * `meta` is `null` for every move introduced in generation IX — PokéAPI has
 * not backfilled it. Drain, recoil, multi-hit and crit ratio for those moves
 * come from `src/ingest/curated/move-meta.ts`.
 */
const moveMetaSchema = z.object({
  category: namedResource,
  crit_rate: z.number(),
  /** Positive is drain, negative is recoil, both as a percentage. */
  drain: z.number(),
  healing: z.number(),
  min_hits: z.number().nullable(),
  max_hits: z.number().nullable(),
})

export type MoveMeta = z.infer<typeof moveMetaSchema>

const effectEntrySchema = z.object({
  short_effect: z.string(),
  language: namedResource,
})

export const moveSchema = z.object({
  id: z.number(),
  name: z.string(),
  /** `null` means the move cannot miss. Never conflate with 100. */
  accuracy: z.number().nullable(),
  power: z.number().nullable(),
  pp: z.number().nullable(),
  priority: z.number(),
  damage_class: z.object({ name: z.enum(MOVE_DAMAGE_CLASSES) }),
  type: namedResource,
  target: z.object({ name: z.enum(POKEAPI_MOVE_TARGETS) }),
  generation: namedResource,
  effect_chance: z.number().nullable(),
  meta: moveMetaSchema.nullable(),
  stat_changes: z.array(z.object({ change: z.number(), stat: namedResource })),
  effect_entries: z.array(effectEntrySchema),
})

export type MoveResponse = z.infer<typeof moveSchema>

// ---------------------------------------------------------------------------
// /item/{name}
// ---------------------------------------------------------------------------

export const itemSchema = z.object({
  id: z.number(),
  name: z.string(),
  fling_power: z.number().nullable(),
  category: namedResource,
  attributes: z.array(namedResource),
  effect_entries: z.array(effectEntrySchema),
})

export type ItemResponse = z.infer<typeof itemSchema>

// ---------------------------------------------------------------------------
// /ability/{name}
// ---------------------------------------------------------------------------

export const abilitySchema = z.object({
  id: z.number(),
  name: z.string(),
  is_main_series: z.boolean(),
  generation: namedResource,
  effect_entries: z.array(effectEntrySchema),
})

export type AbilityResponse = z.infer<typeof abilitySchema>

/** The English `short_effect`, or an empty string when PokéAPI has none. */
export function englishEffect(
  entries: readonly {
    readonly short_effect: string
    readonly language: { readonly name: string }
  }[],
): string {
  return entries.find((entry) => entry.language.name === 'en')?.short_effect ?? ''
}

/** The English display name, or `null` when PokéAPI has none. */
export function englishName(
  entries: readonly { readonly name: string; readonly language: { readonly name: string } }[],
): string | null {
  return entries.find((entry) => entry.language.name === 'en')?.name ?? null
}
