/**
 * Branded identifiers.
 *
 * Every id in the domain is a slug — lowercase, hyphenated, stable across
 * dataset rebuilds (`great-tusk`, `knock-off`, `choice-band`). Branding them
 * means passing a move id where a species id belongs fails typecheck rather
 * than surfacing as an empty lookup three layers down.
 */

declare const brand: unique symbol

type Brand<T, B extends string> = T & { readonly [brand]: B }

export type SpeciesId = Brand<string, 'SpeciesId'>
export type MoveId = Brand<string, 'MoveId'>
export type ItemId = Brand<string, 'ItemId'>
export type AbilityId = Brand<string, 'AbilityId'>
export type FormatId = Brand<string, 'FormatId'>
export type SetId = Brand<string, 'SetId'>
export type TeamId = Brand<string, 'TeamId'>

/** Normalize arbitrary display text into the slug form the dataset keys on. */
export function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const speciesId = (value: string): SpeciesId => toSlug(value) as SpeciesId
export const moveId = (value: string): MoveId => toSlug(value) as MoveId
export const itemId = (value: string): ItemId => toSlug(value) as ItemId
export const abilityId = (value: string): AbilityId => toSlug(value) as AbilityId
export const formatId = (value: string): FormatId => toSlug(value) as FormatId

/**
 * Set and team ids are opaque, not slugs — they come from a uuid generator at
 * the boundary, never from a name. They get factories anyway so that callers
 * brand them in one obvious place instead of scattering casts.
 */
export const setId = (value: string): SetId => value as SetId
export const teamId = (value: string): TeamId => value as TeamId
