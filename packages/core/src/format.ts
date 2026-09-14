import type { AbilityId, FormatId, ItemId, MoveId, SpeciesId } from './ids'
import type { SpeciesClassification } from './species'

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
   * Species that are legal but capped — VGC Regulation I allows two of these
   * per team and Regulation G allows one. Empty when the format has no
   * restricted tier.
   */
  readonly restrictedSpecies: readonly SpeciesId[]
  readonly maxRestricted: number
  /**
   * When set, *only* these species are legal, and every rule above is a
   * further narrowing of this list. Used by regional-dex formats.
   */
  readonly allowlist: readonly SpeciesId[] | null
  /**
   * Whether a species the format's generation does not hold may still be used.
   *
   * False everywhere anyone plays. The games of Generation 9 hold neither
   * Pidgeot nor any Mega form, so no ban list has to name them and none does —
   * a format that had to enumerate the 482 forms Scarlet and Violet left out
   * would be wrong within a patch. True only for the sandbox, which exists to
   * calculate match-ups no real format allows.
   */
  readonly allowsUnavailableSpecies: boolean
}

/**
 * Nothing banned by name or by category.
 *
 * `allowsUnavailableSpecies` is false here and not because a species outside
 * the generation is banned — it is not in the game to ban. Every real format
 * spreads this and adds its own rules, so the safe answer has to be the one it
 * inherits: a regulation added later that forgot the field would otherwise
 * ship legal Mega Evolutions.
 */
export const EMPTY_LEGALITY: LegalityRuleset = {
  bannedClassifications: [],
  bannedSpecies: [],
  bannedItems: [],
  bannedMoves: [],
  bannedAbilities: [],
  restrictedSpecies: [],
  maxRestricted: 0,
  allowlist: null,
  allowsUnavailableSpecies: false,
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
  /**
   * How long a reading of this authority stays good, in days, or null when the
   * format answers to no outside authority and so cannot drift from one.
   *
   * One number cannot serve two authorities. Smogon retiers monthly and Play!
   * Pokémon rotates a regulation on its own clock, so each says here how long
   * its own snapshot is worth trusting, and `sourceFreshness` turns that into a
   * state the interface can show.
   */
  readonly staleAfterDays: number | null
}

/**
 * Whether a ruleset snapshot is still worth trusting, as of a given day.
 *
 * A verification date printed on its own asks the reader to do the arithmetic
 * and to know each authority's cadence. Neither is reasonable, so the check
 * lives here and the interface renders the verdict. See the honesty rules in
 * CLAUDE.md.
 */
export type FreshnessReport =
  | { readonly kind: 'unchanging' }
  | { readonly kind: 'fresh'; readonly ageInDays: number; readonly staleAfterDays: number }
  | { readonly kind: 'stale'; readonly ageInDays: number; readonly staleAfterDays: number }

/**
 * `today` is a parameter because this package may not read a clock. The caller
 * that knows what day it is passes an ISO date; every test states one.
 */
export function sourceFreshness(source: FormatSource, today: string): FreshnessReport {
  if (source.staleAfterDays === null) return { kind: 'unchanging' }
  const ageInDays = daysBetween(source.verifiedOn, today)
  const staleAfterDays = source.staleAfterDays
  return ageInDays > staleAfterDays
    ? { kind: 'stale', ageInDays, staleAfterDays }
    : { kind: 'fresh', ageInDays, staleAfterDays }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Whole days from one ISO date to another, negative if `to` is earlier.
 *
 * Counted with integer arithmetic rather than through `Date`, which this
 * package may not touch, and which would drag a time zone and a daylight-saving
 * boundary into a question that has neither. See CLAUDE.md §The core's four
 * rules.
 */
function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

/**
 * Days since 1970-01-01, by Howard Hinnant's `days_from_civil`.
 *
 * The shifted year starts in March so that the leap day falls at the end of it
 * and the month-length pattern repeats every five months, which is what makes
 * the whole thing four lines of integer division.
 */
function dayNumber(date: string): number {
  const { year, month, day } = civilDate(date)
  const shifted = month <= 2 ? year - 1 : year
  const era = Math.floor(shifted / 400)
  const yearOfEra = shifted - era * 400
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
  return era * 146_097 + dayOfEra - 719_468
}

type CivilDate = { readonly year: number; readonly month: number; readonly day: number }

const MONTH_LENGTHS: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function civilDate(date: string): CivilDate {
  const parts = ISO_DATE.exec(date)
  if (parts === null) throw MalformedDate.of(date)
  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  if (month < 1 || month > 12) throw MalformedDate.of(date)
  if (day < 1 || day > monthLength(year, month)) throw MalformedDate.of(date)
  return { year, month, day }
}

function monthLength(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29
  return MONTH_LENGTHS[month - 1] ?? 0
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

/** Typed error with a static factory, never a hand-written string. */
export class MalformedDate extends Error {
  override readonly name = 'MalformedDate'

  private constructor(readonly value: string) {
    super(`Expected an ISO date of the form YYYY-MM-DD, got "${value}"`)
  }

  static of(value: string): MalformedDate {
    return new MalformedDate(value)
  }
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
