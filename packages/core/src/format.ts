import type { AbilityId, FormatId, ItemId, MoveId, SpeciesId } from './ids.js'
import type { SpeciesClassification } from './species.js'

/**
 * A format is a first-class domain object, not a filter applied late.
 *
 * VGC Regulation H and Smogon OU differ in team size, what you bring, which
 * gimmick exists, how levels work, and what is legal — so anything that reads
 * "which format" from a string and branches is wrong. A format *declares* its
 * rules and the rest of the codebase asks it.
 */
export type Format = {
  readonly id: FormatId
  readonly name: string
  /** Short label for chrome where the full name will not fit. */
  readonly shortName: string
  readonly generation: number
  readonly style: BattleStyle
  /** How many sets a team may hold. */
  readonly teamSize: number
  /** How many are brought to a match. VGC picks 4 of 6; singles brings all 6. */
  readonly bringSize: number
  readonly level: LevelRule
  readonly gimmick: Gimmick
  readonly clauses: readonly Clause[]
  readonly legality: LegalityRuleset
  /** Where the rules came from, shown in the interface. See the honesty rule. */
  readonly source: FormatSource
}

export const BATTLE_STYLES = ['singles', 'doubles'] as const
export type BattleStyle = (typeof BATTLE_STYLES)[number]

/**
 * VGC levels everything to 50. Smogon plays at 100 but lets you set lower.
 * Encoding the difference as a union stops "level 50 or 100?" being answered
 * by a magic number at three call sites.
 */
export type LevelRule =
  | { readonly kind: 'fixed'; readonly level: number }
  | { readonly kind: 'capped'; readonly max: number }

export const GIMMICKS = ['terastal', 'dynamax', 'mega', 'z-move', 'none'] as const
export type Gimmick = (typeof GIMMICKS)[number]

export const CLAUSES = [
  'species',
  'item',
  'sleep',
  'evasion',
  'ohko',
  'endless-battle',
  'nickname',
] as const
export type Clause = (typeof CLAUSES)[number]

export const CLAUSE_LABEL: Readonly<Record<Clause, string>> = {
  species: 'Species Clause',
  item: 'Item Clause',
  sleep: 'Sleep Clause',
  evasion: 'Evasion Clause',
  ohko: 'OHKO Clause',
  'endless-battle': 'Endless Battle Clause',
  nickname: 'Nickname Clause',
}

export const CLAUSE_DESCRIPTION: Readonly<Record<Clause, string>> = {
  species: 'No two Pokémon may share a National Dex number.',
  item: 'No two Pokémon may hold the same item.',
  sleep: 'A player may not put more than one opposing Pokémon to sleep at a time.',
  evasion: 'Moves that raise evasion are banned.',
  ohko: 'One-hit knockout moves are banned.',
  'endless-battle': 'Combinations that make a battle unwinnable are banned.',
  nickname: 'Nicknames must not impersonate another species.',
}

/**
 * What may be used.
 *
 * Two mechanisms, because formats use both. Regulation H bans by *category*
 * (no legendaries, no paradoxes, no mythicals) and then names a handful of
 * individual exceptions. Smogon tiers ban by *name*, one Pokémon at a time.
 */
export type LegalityRuleset = {
  /** Whole categories that may not be used at all. */
  readonly bannedClassifications: readonly SpeciesClassification[]
  readonly bannedSpecies: readonly SpeciesId[]
  readonly bannedItems: readonly ItemId[]
  readonly bannedMoves: readonly MoveId[]
  readonly bannedAbilities: readonly AbilityId[]
  /**
   * Species that are legal but capped — VGC Regulation G allows two of these
   * per team. Empty when the format has no restricted tier.
   */
  readonly restrictedSpecies: readonly SpeciesId[]
  readonly maxRestricted: number
  /**
   * When set, *only* these species are legal, and every rule above is a
   * further narrowing of this list. Used by regional-dex formats.
   */
  readonly allowlist: readonly SpeciesId[] | null
}

export const EMPTY_LEGALITY: LegalityRuleset = {
  bannedClassifications: [],
  bannedSpecies: [],
  bannedItems: [],
  bannedMoves: [],
  bannedAbilities: [],
  restrictedSpecies: [],
  maxRestricted: 0,
  allowlist: null,
}

/**
 * Where a format's rules came from and when they were last checked.
 *
 * This app cannot derive legality from PokéAPI — PokéAPI has no concept of a
 * tier or a regulation. Every ruleset here is hand-curated, so every ruleset
 * says so, in the interface, next to the verdict. See the honesty rules in
 * CLAUDE.md.
 */
export type FormatSource = {
  readonly authority: 'vgc' | 'smogon' | 'custom'
  readonly citation: string
  /** ISO date the ruleset was last verified against the authority. */
  readonly verifiedOn: string
}

export function levelFor(format: Format, requested: number): number {
  return format.level.kind === 'fixed' ? format.level.level : Math.min(requested, format.level.max)
}

export function hasClause(format: Format, clause: Clause): boolean {
  return format.clauses.includes(clause)
}

export function allowsTera(format: Format): boolean {
  return format.gimmick === 'terastal'
}
