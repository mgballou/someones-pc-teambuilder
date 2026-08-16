/**
 * Turning the text a person pasted into ids the dataset knows.
 *
 * Pastes come from Showdown, from Pokepaste, from a forum post, from a phone
 * keyboard. `Landorus-Therian`, `landorus therian`, `Farfetch'd`, `Mr. Mime`
 * and `Type: Null` all name something real and none of them are already a
 * slug. Two candidate slugs cover the whole space: the plain one, and one with
 * apostrophes and periods deleted rather than turned into separators.
 *
 * Resolution goes through the `Dex` and only through the `Dex`. An id this
 * module hands back is an id the dataset answered to, which is what lets the
 * rest of the domain treat a branded id as a promise rather than a hope.
 */

import type { Dex } from '../dex'
import type { AbilityId, ItemId, MoveId, SpeciesId } from '../ids'
import { abilityId, itemId, moveId, speciesId, toSlug } from '../ids'
import { displayName } from '../species'

/**
 * The slugs a piece of display text might be keyed under, best guess first.
 *
 * `toSlug` turns every run of non-alphanumerics into a hyphen, which is right
 * for spaces and wrong for `Farfetch'd` — the dataset keys that as `farfetchd`,
 * not `farfetch-d`. So the second candidate deletes apostrophes and periods
 * before slugging.
 */
export function slugCandidates(text: string): readonly [string, ...string[]] {
  const trimmed = text.trim()
  const plain = toSlug(trimmed)
  const tight = toSlug(trimmed.replace(/['‘’.]/g, ''))
  return plain === tight ? [plain] : [plain, tight]
}

/** The slug to report when nothing resolved — the reading we tried first. */
export function primarySlug(text: string): string {
  return slugCandidates(text)[0]
}

/** True when `name` is a label the importer would resolve back to `id`. */
export function labelResolvesTo(name: string, id: string): boolean {
  return slugCandidates(name).includes(id)
}

/**
 * A slug read back as a display label, for ids the dataset has no name for.
 *
 * Both separators round-trip through `toSlug`, so an export built from a
 * fallback label still imports to the id it came from.
 */
export function labelFromSlug(id: string, separator: string): string {
  return id
    .split('-')
    .map((part) => (part === '' ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(separator)
}

type NameIndex = ReadonlyMap<string, string>

type DexIndex = {
  readonly species: NameIndex
  readonly moves: NameIndex
  readonly items: NameIndex
  readonly abilities: NameIndex
}

/**
 * Built once per `Dex`. A `Dex` is immutable and built before it exists, so
 * memoizing against the instance is a memo and not a cache — same dex in,
 * same index out, no clock and no eviction.
 */
const INDEXES = new WeakMap<Dex, DexIndex>()

function buildIndex(
  entries: readonly { readonly id: string; readonly labels: readonly string[] }[],
): NameIndex {
  const index = new Map<string, string>()
  for (const entry of entries) {
    for (const label of entry.labels) {
      for (const candidate of slugCandidates(label)) {
        if (!index.has(candidate)) index.set(candidate, entry.id)
      }
    }
  }
  return index
}

function indexFor(dex: Dex): DexIndex {
  const existing = INDEXES.get(dex)
  if (existing !== undefined) return existing
  const built: DexIndex = {
    species: buildIndex(
      dex.allSpecies().map((species) => ({
        id: species.id,
        labels: [species.name, displayName(species)],
      })),
    ),
    moves: buildIndex(dex.allMoves().map((move) => ({ id: move.id, labels: [move.name] }))),
    items: buildIndex(dex.allItems().map((item) => ({ id: item.id, labels: [item.name] }))),
    abilities: buildIndex(
      dex.allAbilities().map((ability) => ({ id: ability.id, labels: [ability.name] })),
    ),
  }
  INDEXES.set(dex, built)
  return built
}

type Lookup<Id extends string> = {
  readonly brand: (value: string) => Id
  readonly has: (id: Id) => boolean
  readonly index: NameIndex
}

function resolve<Id extends string>(text: string, lookup: Lookup<Id>): Id | null {
  const candidates = slugCandidates(text)
  for (const candidate of candidates) {
    const id = lookup.brand(candidate)
    if (lookup.has(id)) return id
  }
  for (const candidate of candidates) {
    const found = lookup.index.get(candidate)
    if (found !== undefined) return lookup.brand(found)
  }
  return null
}

export function resolveSpecies(dex: Dex, text: string): SpeciesId | null {
  return resolve(text, {
    brand: speciesId,
    has: (id) => dex.species(id) !== undefined,
    index: indexFor(dex).species,
  })
}

export function resolveMove(dex: Dex, text: string): MoveId | null {
  return resolve(text, {
    brand: moveId,
    has: (id) => dex.move(id) !== undefined,
    index: indexFor(dex).moves,
  })
}

export function resolveItem(dex: Dex, text: string): ItemId | null {
  return resolve(text, {
    brand: itemId,
    has: (id) => dex.item(id) !== undefined,
    index: indexFor(dex).items,
  })
}

export function resolveAbility(dex: Dex, text: string): AbilityId | null {
  return resolve(text, {
    brand: abilityId,
    has: (id) => dex.ability(id) !== undefined,
    index: indexFor(dex).abilities,
  })
}
