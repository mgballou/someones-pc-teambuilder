/**
 * Team legality.
 *
 * The format is a parameter. Every answer here comes from reading the format's
 * own declared rules — its team size, its level rule, its clauses, its gimmick
 * and its legality ruleset. Nothing reads a format id.
 *
 * Every violation names the rule that produced it and carries the format's
 * source, because legality in this app is curated rather than derived and the
 * interface has to say so next to the verdict.
 *
 * The report is invariant under member order. Violations name sets by id, never
 * by slot, and the list is sorted by rule and then by set id, so reordering a
 * team can never change its verdict or even the shape of its report.
 */

import type { Dex } from '../dex'
import type { Format, FormatSource, Gimmick, LevelRule } from '../format'
import { allowsTera, hasClause } from '../format'
import type { AbilityId, ItemId, MoveId, SetId, SpeciesId } from '../ids'
import type { TeraType } from '../pokemon-type'
import type { PokemonSet } from '../set'
import { filledMoves } from '../set'
import type { Species, SpeciesClassification } from '../species'
import { displayName } from '../species'
import type { Stat } from '../stats'
import { MAX_EV_PER_STAT, MAX_EV_TOTAL, STATS, totalEvs } from '../stats'
import type { Team } from '../team'

/* ------------------------------------------------------------------ rules */

export const LEGALITY_RULE_IDS = [
  'team-size',
  'allowlist',
  'banned-classification',
  'banned-species',
  'restricted-cap',
  'banned-item',
  'banned-move',
  'banned-ability',
  'species-clause',
  'item-clause',
  'level',
  'learnset',
  'ability-slot',
  'ev-total',
  'ev-cap',
  'tera',
  'dataset',
] as const

export type LegalityRuleId = (typeof LEGALITY_RULE_IDS)[number]

/**
 * The rule a violation came from, as a value the interface can render. A
 * violation that cannot say which rule rejected it is an argument the player
 * cannot check.
 */
export type LegalityRule = {
  readonly id: LegalityRuleId
  readonly label: string
  readonly description: string
}

export const LEGALITY_RULES: Readonly<Record<LegalityRuleId, LegalityRule>> = {
  'team-size': {
    id: 'team-size',
    label: 'Team size',
    description: 'A team holds no more than the format allows and enough to bring a full match.',
  },
  allowlist: {
    id: 'allowlist',
    label: 'Allowed species',
    description: 'The format lists the only species it permits.',
  },
  'banned-classification': {
    id: 'banned-classification',
    label: 'Banned category',
    description: 'The format bars a whole category of Pokémon.',
  },
  'banned-species': {
    id: 'banned-species',
    label: 'Banned species',
    description: 'The format bars this Pokémon by name.',
  },
  'restricted-cap': {
    id: 'restricted-cap',
    label: 'Restricted allowance',
    description: 'The format caps how many restricted Pokémon one team may hold.',
  },
  'banned-item': {
    id: 'banned-item',
    label: 'Banned item',
    description: 'The format bars this item.',
  },
  'banned-move': {
    id: 'banned-move',
    label: 'Banned move',
    description: 'The format bars this move.',
  },
  'banned-ability': {
    id: 'banned-ability',
    label: 'Banned ability',
    description: 'The format bars this ability.',
  },
  'species-clause': {
    id: 'species-clause',
    label: 'Species Clause',
    description: 'No two Pokémon may share a National Dex number.',
  },
  'item-clause': {
    id: 'item-clause',
    label: 'Item Clause',
    description: 'No two Pokémon may hold the same item.',
  },
  level: {
    id: 'level',
    label: 'Level',
    description: 'The format fixes or caps the level every Pokémon is set to.',
  },
  learnset: {
    id: 'learnset',
    label: 'Learnset',
    description:
      'A Pokémon may only carry moves it can learn in this generation. Egg chains, event moves and version exclusives are not modelled.',
  },
  'ability-slot': {
    id: 'ability-slot',
    label: 'Ability',
    description: 'A Pokémon may only carry an ability its form actually has.',
  },
  'ev-total': {
    id: 'ev-total',
    label: 'EV total',
    description: `A spread may not exceed ${MAX_EV_TOTAL} EVs in total.`,
  },
  'ev-cap': {
    id: 'ev-cap',
    label: 'EV per stat',
    description: `A single stat may not exceed ${MAX_EV_PER_STAT} EVs.`,
  },
  tera: {
    id: 'tera',
    label: 'Terastallization',
    description: 'A Tera type may only be set where the format runs the Terastal gimmick.',
  },
  dataset: {
    id: 'dataset',
    label: 'Dataset',
    description: 'The set names something the dataset does not hold, so it cannot be checked.',
  },
}

/* ------------------------------------------------------------- violations */

/** What kind of record the dataset was missing. */
export type DatasetEntry = 'species' | 'move' | 'item' | 'ability'

type Attribution = {
  /** Which rule rejected the set. Look it up in `LEGALITY_RULES` for its text. */
  readonly rule: LegalityRuleId
  /** Where the rule came from, so the interface can show it beside the verdict. */
  readonly source: FormatSource
  /** Plain sentence naming what is wrong. */
  readonly message: string
}

/**
 * One reason a team is not legal.
 *
 * A discriminated union rather than a string, so the interface renders a banned
 * species with a sprite, an EV overspend with a number, and a Species Clause
 * break by highlighting both offending slots.
 */
export type Violation =
  | (Attribution & {
      readonly kind: 'team-size'
      readonly actual: number
      readonly min: number
      readonly max: number
    })
  | (Attribution & {
      readonly kind: 'species-not-allowed'
      readonly setId: SetId
      readonly species: SpeciesId
    })
  | (Attribution & {
      readonly kind: 'classification-banned'
      readonly setId: SetId
      readonly species: SpeciesId
      readonly classification: SpeciesClassification
    })
  | (Attribution & {
      readonly kind: 'species-banned'
      readonly setId: SetId
      readonly species: SpeciesId
    })
  | (Attribution & {
      readonly kind: 'restricted-limit'
      readonly setIds: readonly SetId[]
      readonly used: number
      readonly allowed: number
    })
  | (Attribution & { readonly kind: 'item-banned'; readonly setId: SetId; readonly item: ItemId })
  | (Attribution & { readonly kind: 'move-banned'; readonly setId: SetId; readonly move: MoveId })
  | (Attribution & {
      readonly kind: 'ability-banned'
      readonly setId: SetId
      readonly ability: AbilityId
    })
  | (Attribution & {
      readonly kind: 'species-clause'
      readonly setIds: readonly SetId[]
      readonly dexNumber: number
    })
  | (Attribution & {
      readonly kind: 'item-clause'
      readonly setIds: readonly SetId[]
      readonly item: ItemId
    })
  | (Attribution & {
      readonly kind: 'level'
      readonly setId: SetId
      readonly level: number
      readonly required: LevelRule
    })
  | (Attribution & {
      readonly kind: 'move-not-learnable'
      readonly setId: SetId
      readonly species: SpeciesId
      readonly move: MoveId
    })
  | (Attribution & {
      readonly kind: 'ability-not-available'
      readonly setId: SetId
      readonly species: SpeciesId
      readonly ability: AbilityId
    })
  | (Attribution & {
      readonly kind: 'ev-total'
      readonly setId: SetId
      readonly total: number
      readonly max: number
    })
  | (Attribution & {
      readonly kind: 'ev-cap'
      readonly setId: SetId
      readonly stat: Stat
      readonly value: number
      readonly max: number
    })
  | (Attribution & {
      readonly kind: 'tera-not-allowed'
      readonly setId: SetId
      readonly teraType: TeraType
      readonly gimmick: Gimmick
    })
  | (Attribution & {
      readonly kind: 'missing-from-dataset'
      readonly setId: SetId
      readonly entry: DatasetEntry
      readonly id: string
    })

export type ViolationKind = Violation['kind']

export type LegalityReport = {
  readonly legal: boolean
  readonly violations: readonly Violation[]
}

/** Every set a violation points at, for highlighting slots in the interface. */
export function violationSetIds(violation: Violation): readonly SetId[] {
  switch (violation.kind) {
    case 'team-size':
      return []
    case 'restricted-limit':
    case 'species-clause':
    case 'item-clause':
      return violation.setIds
    case 'species-not-allowed':
    case 'classification-banned':
    case 'species-banned':
    case 'item-banned':
    case 'move-banned':
    case 'ability-banned':
    case 'level':
    case 'move-not-learnable':
    case 'ability-not-available':
    case 'ev-total':
    case 'ev-cap':
    case 'tera-not-allowed':
    case 'missing-from-dataset':
      return [violation.setId]
    default: {
      const exhaustive: never = violation
      return exhaustive
    }
  }
}

/* ----------------------------------------------------------- the predicate */

/**
 * Whether a format's ruleset admits a species at all.
 *
 * Restricted species pass — they are capped, not banned, and the cap is a team
 * level question. Shared with the speed ladder, which builds its benchmarks
 * from the species a format actually permits.
 */
export function isSpeciesLegal(species: Species, format: Format): boolean {
  const { legality } = format
  if (legality.allowlist !== null && !legality.allowlist.includes(species.id)) return false
  if (legality.bannedClassifications.includes(species.classification)) return false
  if (legality.bannedSpecies.includes(species.id)) return false
  return true
}

/* --------------------------------------------------------------- the check */

export type ValidateTeamInput = {
  readonly team: Team
  readonly format: Format
  readonly dex: Dex
}

export function validateTeam({ team, format, dex }: ValidateTeamInput): LegalityReport {
  const source = format.source
  const collected: Violation[] = []

  const min = Math.min(format.bringSize, format.teamSize)
  if (team.members.length < min || team.members.length > format.teamSize) {
    collected.push({
      kind: 'team-size',
      actual: team.members.length,
      min,
      max: format.teamSize,
      rule: 'team-size',
      source,
      message: `${format.name} needs between ${min} and ${format.teamSize} Pokémon. This team has ${team.members.length}.`,
    })
  }

  // Sorted by set id so the report never depends on slot order.
  const members = [...team.members].sort((a, b) => compareIds(a.id, b.id))

  for (const set of members) {
    collected.push(...checkMember({ set, format, dex, source }))
  }

  collected.push(...checkRestrictedCap({ members, format, dex, source }))
  collected.push(...checkSpeciesClause({ members, format, dex, source }))
  collected.push(...checkItemClause({ members, format, dex, source }))

  const violations = collected.sort(compareViolations)
  return { legal: violations.length === 0, violations }
}

/* ------------------------------------------------------- per-member checks */

type MemberContext = {
  readonly set: PokemonSet
  readonly format: Format
  readonly dex: Dex
  readonly source: FormatSource
}

function checkMember({ set, format, dex, source }: MemberContext): readonly Violation[] {
  const found: Violation[] = []
  const { legality } = format

  found.push(...checkLevel({ set, format, source }))
  found.push(...checkEvs(set, source))
  found.push(...checkTera({ set, format, source }))

  const species = dex.species(set.species)
  if (species === undefined) {
    found.push(missingEntry({ set, entry: 'species', id: set.species, source }))
    return found
  }

  const label = displayName(species)

  if (legality.allowlist !== null && !legality.allowlist.includes(species.id)) {
    found.push({
      kind: 'species-not-allowed',
      setId: set.id,
      species: species.id,
      rule: 'allowlist',
      source,
      message: `${label} is not on ${format.name}'s list of allowed Pokémon.`,
    })
  }

  if (legality.bannedClassifications.includes(species.classification)) {
    found.push({
      kind: 'classification-banned',
      setId: set.id,
      species: species.id,
      classification: species.classification,
      rule: 'banned-classification',
      source,
      message: `${format.name} bars every ${species.classification} Pokémon, and ${label} is one.`,
    })
  }

  if (legality.bannedSpecies.includes(species.id)) {
    found.push({
      kind: 'species-banned',
      setId: set.id,
      species: species.id,
      rule: 'banned-species',
      source,
      message: `${label} is banned in ${format.name}.`,
    })
  }

  found.push(...checkItem({ set, format, dex, source }))
  found.push(...checkAbility({ set, species, format, dex, source }))
  found.push(...checkMoves({ set, species, format, dex, source }))

  return found
}

function checkLevel({ set, format, source }: Omit<MemberContext, 'dex'>): readonly Violation[] {
  const rule = format.level
  const wrong = (message: string): Violation => ({
    kind: 'level',
    setId: set.id,
    level: set.level,
    required: rule,
    rule: 'level',
    source,
    message,
  })

  switch (rule.kind) {
    case 'fixed':
      return set.level === rule.level
        ? []
        : [
            wrong(
              `${format.name} sets every Pokémon to level ${rule.level}. This one is ${set.level}.`,
            ),
          ]
    case 'capped':
      return set.level >= 1 && set.level <= rule.max
        ? []
        : [wrong(`${format.name} allows levels 1 to ${rule.max}. This one is ${set.level}.`)]
    default: {
      const exhaustive: never = rule
      return exhaustive
    }
  }
}

function checkEvs(set: PokemonSet, source: FormatSource): readonly Violation[] {
  const found: Violation[] = []
  const total = totalEvs(set.evs)

  if (total > MAX_EV_TOTAL) {
    found.push({
      kind: 'ev-total',
      setId: set.id,
      total,
      max: MAX_EV_TOTAL,
      rule: 'ev-total',
      source,
      message: `This spread uses ${total} EVs. The limit is ${MAX_EV_TOTAL}.`,
    })
  }

  for (const stat of STATS) {
    const value = set.evs[stat]
    if (value > MAX_EV_PER_STAT) {
      found.push({
        kind: 'ev-cap',
        setId: set.id,
        stat,
        value,
        max: MAX_EV_PER_STAT,
        rule: 'ev-cap',
        source,
        message: `${value} EVs in one stat. The per-stat limit is ${MAX_EV_PER_STAT}.`,
      })
    }
  }

  return found
}

function checkTera({ set, format, source }: Omit<MemberContext, 'dex'>): readonly Violation[] {
  if (set.teraType === null || allowsTera(format)) return []
  return [
    {
      kind: 'tera-not-allowed',
      setId: set.id,
      teraType: set.teraType,
      gimmick: format.gimmick,
      rule: 'tera',
      source,
      message: `${format.name} does not run Terastallization, so a Tera type cannot be set.`,
    },
  ]
}

function checkItem({ set, format, dex, source }: MemberContext): readonly Violation[] {
  if (set.item === null) return []
  const item = dex.item(set.item)
  if (item === undefined) {
    return [missingEntry({ set, entry: 'item', id: set.item, source })]
  }
  if (!format.legality.bannedItems.includes(item.id)) return []
  return [
    {
      kind: 'item-banned',
      setId: set.id,
      item: item.id,
      rule: 'banned-item',
      source,
      message: `${item.name} is banned in ${format.name}.`,
    },
  ]
}

function checkAbility({
  set,
  species,
  format,
  dex,
  source,
}: MemberContext & { readonly species: Species }): readonly Violation[] {
  if (set.ability === null) return []
  const ability = dex.ability(set.ability)
  if (ability === undefined) {
    return [missingEntry({ set, entry: 'ability', id: set.ability, source })]
  }

  const found: Violation[] = []

  if (format.legality.bannedAbilities.includes(ability.id)) {
    found.push({
      kind: 'ability-banned',
      setId: set.id,
      ability: ability.id,
      rule: 'banned-ability',
      source,
      message: `${ability.name} is banned in ${format.name}.`,
    })
  }

  const available = species.abilities.includes(ability.id) || species.hiddenAbility === ability.id
  if (!available) {
    found.push({
      kind: 'ability-not-available',
      setId: set.id,
      species: species.id,
      ability: ability.id,
      rule: 'ability-slot',
      source,
      message: `${displayName(species)} cannot have ${ability.name}.`,
    })
  }

  return found
}

function checkMoves({
  set,
  species,
  format,
  dex,
  source,
}: MemberContext & { readonly species: Species }): readonly Violation[] {
  const found: Violation[] = []
  const learnset = dex.learnset(species.id)

  for (const id of filledMoves(set)) {
    const move = dex.move(id)
    if (move === undefined) {
      found.push(missingEntry({ set, entry: 'move', id, source }))
      continue
    }

    if (format.legality.bannedMoves.includes(move.id)) {
      found.push({
        kind: 'move-banned',
        setId: set.id,
        move: move.id,
        rule: 'banned-move',
        source,
        message: `${move.name} is banned in ${format.name}.`,
      })
    }

    if (!learnset.includes(move.id)) {
      found.push({
        kind: 'move-not-learnable',
        setId: set.id,
        species: species.id,
        move: move.id,
        rule: 'learnset',
        source,
        message: `${displayName(species)} cannot learn ${move.name} in this generation.`,
      })
    }
  }

  return found
}

function missingEntry({
  set,
  entry,
  id,
  source,
}: {
  readonly set: PokemonSet
  readonly entry: DatasetEntry
  readonly id: string
  readonly source: FormatSource
}): Violation {
  return {
    kind: 'missing-from-dataset',
    setId: set.id,
    entry,
    id,
    rule: 'dataset',
    source,
    message: `The dataset holds no ${entry} with the id "${id}", so this set cannot be checked.`,
  }
}

/* --------------------------------------------------------- team-wide checks */

type TeamContext = {
  readonly members: readonly PokemonSet[]
  readonly format: Format
  readonly dex: Dex
  readonly source: FormatSource
}

function checkRestrictedCap({ members, format, dex, source }: TeamContext): readonly Violation[] {
  const { restrictedSpecies, maxRestricted } = format.legality
  if (restrictedSpecies.length === 0) return []

  const offenders = members
    .filter((set) => restrictedSpecies.includes(set.species))
    .map((set) => set.id)

  if (offenders.length <= maxRestricted) return []

  const names = members
    .filter((set) => restrictedSpecies.includes(set.species))
    .map((set) => {
      const species = dex.species(set.species)
      return species === undefined ? set.species : displayName(species)
    })
    .join(', ')

  return [
    {
      kind: 'restricted-limit',
      setIds: offenders,
      used: offenders.length,
      allowed: maxRestricted,
      rule: 'restricted-cap',
      source,
      message: `${format.name} allows ${maxRestricted} restricted Pokémon. This team has ${offenders.length}: ${names}.`,
    },
  ]
}

function checkSpeciesClause({ members, format, dex, source }: TeamContext): readonly Violation[] {
  if (!hasClause(format, 'species')) return []

  const byDexNumber = new Map<number, SetId[]>()
  for (const set of members) {
    const species = dex.species(set.species)
    if (species === undefined) continue
    const bucket = byDexNumber.get(species.dexNumber)
    if (bucket === undefined) byDexNumber.set(species.dexNumber, [set.id])
    else bucket.push(set.id)
  }

  return [...byDexNumber.entries()]
    .filter(([, setIds]) => setIds.length > 1)
    .sort(([a], [b]) => a - b)
    .map(([dexNumber, setIds]) => ({
      kind: 'species-clause' as const,
      setIds,
      dexNumber,
      rule: 'species-clause',
      source,
      message: `${setIds.length} Pokémon share National Dex number ${dexNumber}. ${format.name} allows one.`,
    }))
}

function checkItemClause({ members, format, dex, source }: TeamContext): readonly Violation[] {
  if (!hasClause(format, 'item')) return []

  const byItem = new Map<ItemId, SetId[]>()
  for (const set of members) {
    if (set.item === null) continue
    const bucket = byItem.get(set.item)
    if (bucket === undefined) byItem.set(set.item, [set.id])
    else bucket.push(set.id)
  }

  return [...byItem.entries()]
    .filter(([, setIds]) => setIds.length > 1)
    .sort(([a], [b]) => compareIds(a, b))
    .map(([item, setIds]) => ({
      kind: 'item-clause' as const,
      setIds,
      item,
      rule: 'item-clause',
      source,
      message: `${setIds.length} Pokémon hold ${dex.item(item)?.name ?? item}. ${format.name} allows one of each item.`,
    }))
}

/* ----------------------------------------------------------------- sorting */

const RULE_ORDER: Readonly<Record<LegalityRuleId, number>> = Object.fromEntries(
  LEGALITY_RULE_IDS.map((id, index) => [id, index]),
  // `Object.fromEntries` cannot keep the key union, and a type guard cannot
  // recover it. The source array is the union itself, so the shape is sound.
) as Readonly<Record<LegalityRuleId, number>>

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function compareViolations(a: Violation, b: Violation): number {
  const byRule = RULE_ORDER[a.rule] - RULE_ORDER[b.rule]
  if (byRule !== 0) return byRule
  return compareIds(violationSetIds(a).join(','), violationSetIds(b).join(','))
}
