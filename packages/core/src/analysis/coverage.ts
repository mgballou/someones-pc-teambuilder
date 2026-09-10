/**
 * Type coverage, offensive and defensive.
 *
 * Offence reads the team's actual damaging moves — not its typing — because a
 * Fire type with no Fire move covers nothing. Defence reads the six-by-eighteen
 * grid and ranks the weaknesses more than one member shares, which is the
 * "four of your six take double from Ground" check this panel exists for.
 *
 * Two things this file used to get wrong, and both were the same mistake — it
 * was confident about a question it had only half asked:
 *
 * - **Nobody brings a single type.** Scoring a move against one defending type
 *   at a time says Ghost is covered and Dark is covered, and says nothing about
 *   Spiritomb, which is both. `byTyping` measures against the typings species
 *   in the dataset actually have, which is the question a builder asked.
 * - **An ability can make the chart irrelevant.** Six Levitate holders were
 *   told three of them take double from Ground. Ability immunities now move the
 *   grid, and every ability that changes a hit some other way is named in the
 *   notes rather than passed over.
 *
 * Four limits, stated rather than hidden:
 *
 * - Terastallizing changes what a move gets STAB from, not what type the move
 *   is, so `stab` accounts for the Tera type and the multiplier does not. Moves
 *   whose type is decided at run time, Tera Blast among them, are read at their
 *   printed type.
 * - The defensive grid uses each member's printed typing. Terastallizing rewrites
 *   it, but only once per battle and only for one member, so a grid that assumed
 *   it would be lying about the other five.
 * - The grid folds in ability *immunities* and nothing else. Thick Fat halves a
 *   Fire hit without changing what the chart says, and a multiplier cell cannot
 *   carry that without claiming a resistance the Pokémon does not have. Those
 *   abilities are named in the notes instead.
 * - The offensive reading is against typing alone, because the other team's
 *   abilities are not knowable from here. A note says so.
 */

import { abilityEntry, absorbsType } from '../damage/abilities'
import type { AbilityEntry } from '../damage/abilities'
import type { Dex } from '../dex'
import type { Format } from '../format'
import type { AbilityId, MoveId, SetId, SpeciesId } from '../ids'
import { isDamaging } from '../move'
import type { PokemonType } from '../pokemon-type'
import {
  effectivenessAgainst,
  effectivenessOf,
  isPokemonType,
  POKEMON_TYPES,
} from '../pokemon-type'
import type { PokemonSet } from '../set'
import { filledMoves } from '../set'
import type { Species } from '../species'
import type { Team } from '../team'
import { isSpeciesLegal } from './legality'

/** A reading per attacking type. Eighteen entries, always all eighteen. */
export type TypeTable<T> = Readonly<Record<PokemonType, T>>

/** A defending typing as a Pokémon actually has one: one type, or two. */
export type DefendingTyping = readonly [PokemonType] | readonly [PokemonType, PokemonType]

/* --------------------------------------------------------------- offensive */

/** One damaging move on the team, measured against one defending typing. */
export type OffensiveHit = {
  readonly setId: SetId
  readonly species: SpeciesId
  readonly move: MoveId
  readonly moveType: PokemonType
  readonly multiplier: number
  /** True when the mover gets STAB, counting its Tera type if it has one. */
  readonly stab: boolean
}

export type OffensiveMatchup = {
  readonly defending: PokemonType
  /** Highest multiplier anything on the team reaches against this type. */
  readonly best: number
  /** Every hit that reaches `best`, so the interface can name the mover. */
  readonly bestHits: readonly OffensiveHit[]
}

/**
 * The same reading against a whole typing rather than one type.
 *
 * `examples` is capped, because this names a gap rather than taking a census —
 * a builder wants "Spiritomb, Sableye", not thirty-one Water/Flying entries.
 */
export type TypingMatchup = {
  readonly types: DefendingTyping
  readonly best: number
  readonly bestHits: readonly OffensiveHit[]
  /** How many species in the pool carry exactly this typing. */
  readonly speciesCount: number
  readonly examples: readonly SpeciesId[]
}

export const TYPING_EXAMPLE_LIMIT = 3

export type OffensiveCoverage = {
  readonly byType: TypeTable<OffensiveMatchup>
  /** Types something on the team hits for more than 1x. */
  readonly superEffective: readonly PokemonType[]
  /** Types nothing on the team hits for more than 1x. The single-type gap list. */
  readonly uncovered: readonly PokemonType[]
  /**
   * Every typing a species in the pool actually has, most common first. This is
   * the reading against a Pokémon rather than against the type chart.
   */
  readonly byTyping: readonly TypingMatchup[]
  /** Typings nothing on the team hits for more than 1x. The real gap list. */
  readonly uncoveredTypings: readonly TypingMatchup[]
  /** Damaging move types the team carries, in chart order. */
  readonly attackingTypes: readonly PokemonType[]
  /** True when no member carries a damaging move at all. */
  readonly unarmed: boolean
}

/* --------------------------------------------------------------- defensive */

export type MemberDefense = {
  readonly setId: SetId
  readonly species: SpeciesId
  readonly types: readonly PokemonType[]
  /** The set's chosen ability, or `null` when it has not chosen one. */
  readonly ability: AbilityId | null
  /** Multiplier per attacking type, chart plus whatever the ability absorbs. */
  readonly takes: TypeTable<number>
  /** Types the ability zeroes that the chart does not. Levitate against Ground. */
  readonly abilityImmunities: readonly PokemonType[]
}

export type SharedWeakness = {
  readonly type: PokemonType
  /** Members taking 2x or more, by set id. */
  readonly members: readonly SetId[]
  readonly count: number
}

export type DefensiveCoverage = {
  readonly grid: readonly MemberDefense[]
  /** Weaknesses two or more members share, most-shared first. */
  readonly sharedWeaknesses: readonly SharedWeakness[]
  /** Types no member resists or is immune to. */
  readonly unresisted: readonly PokemonType[]
}

/* ------------------------------------------------------------------- notes */

/**
 * Something the report could not account for. Named rather than dropped — a
 * coverage panel that quietly ignores a move is worse than one that says it
 * could not read it.
 */
export type CoverageNote =
  | { readonly kind: 'unknown-move'; readonly setId: SetId; readonly move: MoveId }
  | { readonly kind: 'unknown-species'; readonly setId: SetId; readonly species: SpeciesId }
  /** The set has no ability chosen, so the grid could only read printed typing. */
  | { readonly kind: 'no-ability'; readonly setId: SetId }
  /** An ability nothing in this codebase models. It may change the row entirely. */
  | { readonly kind: 'unmodelled-ability'; readonly setId: SetId; readonly ability: AbilityId }
  /** Modelled, but it changes a hit in a way a type multiplier cannot carry. */
  | { readonly kind: 'ability-beyond-the-grid'; readonly setId: SetId; readonly ability: AbilityId }
  /** The offensive reading cannot know the other side's abilities. Always true. */
  | { readonly kind: 'foe-abilities-unknown' }

export function coverageNoteText(note: CoverageNote): string {
  switch (note.kind) {
    case 'unknown-move':
      return `Move "${note.move}" is not in the dataset.`
    case 'unknown-species':
      return `Species "${note.species}" is not in the dataset.`
    case 'no-ability':
      return 'No ability chosen, so this row is printed typing only.'
    case 'unmodelled-ability':
      return `${note.ability} is not modelled here. If it changes what this Pokémon takes, the row does not show it.`
    case 'ability-beyond-the-grid':
      return `${note.ability} changes what this Pokémon takes in a way a type multiplier cannot carry, so the row leaves it out.`
    case 'foe-abilities-unknown':
      return 'Offensive coverage reads typing alone. Levitate, Flash Fire and every other ability immunity sit on the other side of the screen and cannot be read from here.'
    default: {
      const exhaustive: never = note
      return exhaustive
    }
  }
}

export type CoverageReport = {
  readonly offensive: OffensiveCoverage
  readonly defensive: DefensiveCoverage
  readonly notes: readonly CoverageNote[]
}

export type AnalyzeCoverageInput = {
  readonly team: Team
  readonly dex: Dex
  /**
   * Which species the offensive reading is measured against. Given a format,
   * the typings are the ones that format permits; without one, every typing in
   * the dataset. The panel is answering a question about a format, not about
   * the type chart.
   */
  readonly format?: Format
}

export function analyzeCoverage({ team, dex, format }: AnalyzeCoverageInput): CoverageReport {
  const notes: CoverageNote[] = []
  const hits = collectHits({ team, dex, notes })
  const grid = buildGrid({ team, dex, notes })
  const pool = typingPool({ dex, format })

  if (hits.length > 0) notes.push({ kind: 'foe-abilities-unknown' })

  return {
    offensive: buildOffensive(hits, pool),
    defensive: buildDefensive(grid),
    notes,
  }
}

/* ------------------------------------------------------------ the offensive */

type LoadedMove = {
  readonly setId: SetId
  readonly species: SpeciesId
  readonly move: MoveId
  readonly moveType: PokemonType
  readonly stab: boolean
}

function collectHits({
  team,
  dex,
  notes,
}: {
  readonly team: Team
  readonly dex: Dex
  readonly notes: CoverageNote[]
}): readonly LoadedMove[] {
  const loaded: LoadedMove[] = []

  for (const set of team.members) {
    const species = dex.species(set.species)
    const stabTypes = species === undefined ? stabTypesOf(set, []) : stabTypesOf(set, species.types)

    for (const id of filledMoves(set)) {
      const move = dex.move(id)
      if (move === undefined) {
        notes.push({ kind: 'unknown-move', setId: set.id, move: id })
        continue
      }
      if (!isDamaging(move)) continue
      loaded.push({
        setId: set.id,
        species: set.species,
        move: move.id,
        moveType: move.type,
        stab: stabTypes.includes(move.type),
      })
    }
  }

  return loaded
}

/**
 * The types a set gets STAB from: its printed typing, plus its Tera type.
 *
 * Terastallizing into a type the species already has keeps the original STAB
 * rather than replacing it, so the union is right. A Stellar Tera type is not a
 * defensive or offensive type and adds nothing here.
 */
function stabTypesOf(set: PokemonSet, printed: readonly PokemonType[]): readonly PokemonType[] {
  if (set.teraType === null || !isPokemonType(set.teraType)) return printed
  return printed.includes(set.teraType) ? printed : [...printed, set.teraType]
}

/**
 * The defending typings to measure against, and how many species carry each.
 *
 * Drawn from the dataset rather than from all 171 arithmetic combinations,
 * because half of those describe nothing that exists and would bury the ones
 * that do.
 */
type TypingPool = readonly {
  readonly types: DefendingTyping
  readonly species: readonly SpeciesId[]
}[]

function typingPool({
  dex,
  format,
}: {
  readonly dex: Dex
  readonly format: Format | undefined
}): TypingPool {
  const allowed = (species: Species): boolean =>
    format === undefined ? true : isSpeciesLegal(species, format)

  const byKey = new Map<string, { types: DefendingTyping; species: SpeciesId[] }>()

  for (const species of dex.allSpecies()) {
    if (!allowed(species)) continue
    const types = orderedTyping(species.types)
    const key = types.join('/')
    const existing = byKey.get(key)
    if (existing === undefined) byKey.set(key, { types, species: [species.id] })
    else existing.species.push(species.id)
  }

  return [...byKey.values()].sort(
    (a, b) => b.species.length - a.species.length || compareTypings(a.types, b.types),
  )
}

/**
 * Chart order, so Water/Flying and Flying/Water are one typing rather than two.
 * Defensively they are identical, and printing both would double the gap list.
 */
function orderedTyping(types: Species['types']): DefendingTyping {
  const [first, second] = types
  if (second === undefined || second === first) return [first]
  return POKEMON_TYPES.indexOf(first) <= POKEMON_TYPES.indexOf(second)
    ? [first, second]
    : [second, first]
}

function compareTypings(a: DefendingTyping, b: DefendingTyping): number {
  const key = (typing: DefendingTyping): string => typing.join('/')
  return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0
}

function buildOffensive(hits: readonly LoadedMove[], pool: TypingPool): OffensiveCoverage {
  const byType = tableOf<OffensiveMatchup>((defending) => {
    const scored = score(hits, (hit) => effectivenessOf(hit.moveType, defending))
    return { defending, best: scored.best, bestHits: scored.bestHits }
  })

  const byTyping = pool.map((entry): TypingMatchup => {
    const scored = score(hits, (hit) => effectivenessAgainst(hit.moveType, entry.types))
    return {
      types: entry.types,
      best: scored.best,
      bestHits: scored.bestHits,
      speciesCount: entry.species.length,
      examples: entry.species.slice(0, TYPING_EXAMPLE_LIMIT),
    }
  })

  const attackingTypes = POKEMON_TYPES.filter((type) => hits.some((hit) => hit.moveType === type))

  return {
    byType,
    superEffective: POKEMON_TYPES.filter((type) => byType[type].best > 1),
    uncovered: POKEMON_TYPES.filter((type) => byType[type].best <= 1),
    byTyping,
    uncoveredTypings: byTyping.filter((matchup) => matchup.best <= 1),
    attackingTypes,
    unarmed: hits.length === 0,
  }
}

function score(
  hits: readonly LoadedMove[],
  multiplierOf: (hit: LoadedMove) => number,
): { readonly best: number; readonly bestHits: readonly OffensiveHit[] } {
  const scored = hits.map((hit) => ({ ...hit, multiplier: multiplierOf(hit) }))
  const best = scored.reduce((highest, hit) => Math.max(highest, hit.multiplier), 0)
  return { best, bestHits: scored.filter((hit) => hit.multiplier === best) }
}

/* ------------------------------------------------------------ the defensive */

function buildGrid({
  team,
  dex,
  notes,
}: {
  readonly team: Team
  readonly dex: Dex
  readonly notes: CoverageNote[]
}): readonly MemberDefense[] {
  const grid: MemberDefense[] = []

  for (const set of team.members) {
    const species = dex.species(set.species)
    if (species === undefined) {
      notes.push({ kind: 'unknown-species', setId: set.id, species: set.species })
      continue
    }

    const entry = abilityEntry(set.ability)
    notes.push(...abilityNotes(set.id, set.ability, entry))

    const abilityImmunities = POKEMON_TYPES.filter(
      (attacking) =>
        absorbsType(entry, attacking) && effectivenessAgainst(attacking, species.types) > 0,
    )

    grid.push({
      setId: set.id,
      species: species.id,
      types: species.types,
      ability: set.ability,
      takes: tableOf((attacking) =>
        absorbsType(entry, attacking) ? 0 : effectivenessAgainst(attacking, species.types),
      ),
      abilityImmunities,
    })
  }

  return grid
}

/**
 * What the grid could not carry about this set's ability.
 *
 * An immunity moves a cell to zero and needs no note. Everything else — Thick
 * Fat halving a Fire hit, Multiscale halving the first one, Wonder Guard
 * rewriting the whole row — changes damage without changing what the chart
 * says, and writing it into a multiplier would claim a resistance the Pokémon
 * does not have.
 */
function abilityNotes(
  setId: SetId,
  ability: AbilityId | null,
  entry: AbilityEntry | null,
): readonly CoverageNote[] {
  if (ability === null) return [{ kind: 'no-ability', setId }]
  if (entry === null) return [{ kind: 'unmodelled-ability', setId, ability }]
  return changesDamageBeyondImmunity(entry)
    ? [{ kind: 'ability-beyond-the-grid', setId, ability }]
    : []
}

function changesDamageBeyondImmunity(entry: AbilityEntry): boolean {
  return (
    entry.foeAttackStat !== undefined ||
    entry.defenseStat !== undefined ||
    entry.finalDefender !== undefined ||
    entry.alterEffectiveness !== undefined ||
    entry.foeAttackStage !== undefined ||
    hasNonImmuneTypeResponse(entry)
  )
}

function hasNonImmuneTypeResponse(entry: AbilityEntry): boolean {
  if (entry.typeResponse === undefined) return false
  return Object.values(entry.typeResponse).some(
    (response) => response !== undefined && response.kind !== 'immune',
  )
}

function buildDefensive(grid: readonly MemberDefense[]): DefensiveCoverage {
  const sharedWeaknesses = POKEMON_TYPES.map((type) => {
    const members = grid.filter((member) => member.takes[type] >= 2).map((member) => member.setId)
    return { type, members, count: members.length }
  })
    .filter((weakness) => weakness.count >= 2)
    .sort(
      (a, b) => b.count - a.count || POKEMON_TYPES.indexOf(a.type) - POKEMON_TYPES.indexOf(b.type),
    )

  const unresisted = POKEMON_TYPES.filter((type) => !grid.some((member) => member.takes[type] < 1))

  return { grid, sharedWeaknesses, unresisted }
}

/* ------------------------------------------------------------------ tables */

function tableOf<T>(compute: (type: PokemonType) => T): TypeTable<T> {
  // `Object.fromEntries` cannot keep the key union and no type guard recovers
  // it. The keys come from `POKEMON_TYPES` itself, so the shape is sound.
  return Object.fromEntries(POKEMON_TYPES.map((type) => [type, compute(type)])) as TypeTable<T>
}
