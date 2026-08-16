/**
 * Writing a set out as a Showdown paste.
 *
 * Every line whose value is at its default is omitted, which is what makes an
 * exported paste readable and what makes it match what Showdown itself would
 * have written. The one rule underneath all of it: a label this module prints
 * must be a label `parse` resolves back to the same id. Where the dataset's
 * own name would not survive that trip, the id is printed instead.
 */

import type { Dex } from '../dex.js'
import type { Format } from '../format.js'
import type { AbilityId, ItemId, MoveId, SpeciesId } from '../ids.js'
import type { TeraType } from '../pokemon-type.js'
import type { Gender, PokemonSet } from '../set.js'
import { displayName } from '../species.js'
import type { Nature, Stat, StatSpread } from '../stats.js'
import { DEFAULT_LEVEL, MAX_IV, STAT_LABEL, STATS } from '../stats.js'
import type { Team } from '../team.js'
import { labelFromSlug, labelResolvesTo } from './resolve.js'

export type SerializeInput = {
  readonly set: PokemonSet
  readonly dex: Dex
  /**
   * The level a paste means when it carries no `Level:` line. Showdown's own
   * default is 100; this app builds at 50. Pass the format's, via
   * `defaultLevelFor`, and export and import agree.
   */
  readonly defaultLevel?: number
}

export type SerializeTeamInput = {
  readonly team: Team
  readonly dex: Dex
  readonly defaultLevel?: number
}

/** The level a format leaves implied, for the `defaultLevel` option. */
export function defaultLevelFor(format: Format): number {
  const rule = format.level
  switch (rule.kind) {
    case 'fixed':
      return rule.level
    case 'capped':
      return rule.max
    default: {
      const exhaustive: never = rule
      return exhaustive
    }
  }
}

export function serialize({ set, dex, defaultLevel = DEFAULT_LEVEL }: SerializeInput): string {
  const lines: string[] = [identityLine(set, dex)]

  if (set.ability !== null) lines.push(`Ability: ${abilityLabel(dex, set.ability)}`)
  if (set.level !== defaultLevel) lines.push(`Level: ${set.level}`)
  if (set.shiny) lines.push('Shiny: Yes')
  if (set.gigantamax) lines.push('Gigantamax: Yes')
  if (set.teraType !== null) lines.push(`Tera Type: ${teraLabel(set.teraType)}`)

  const evs = spreadLine(set.evs, 0)
  if (evs !== null) lines.push(`EVs: ${evs}`)

  lines.push(`${natureLabel(set.nature)} Nature`)

  const ivs = spreadLine(set.ivs, MAX_IV)
  if (ivs !== null) lines.push(`IVs: ${ivs}`)

  for (const move of set.moves) {
    if (move !== null) lines.push(`- ${moveLabel(dex, move)}`)
  }

  return lines.join('\n')
}

/** Sets in team order, one blank line between them. */
export function serializeTeam({
  team,
  dex,
  defaultLevel = DEFAULT_LEVEL,
}: SerializeTeamInput): string {
  return team.members.map((set) => serialize({ set, dex, defaultLevel })).join('\n\n')
}

const GENDER_MARK: Readonly<Record<Gender, string>> = {
  male: ' (M)',
  female: ' (F)',
  /** Showdown has no genderless marker. Absence is the notation. */
  genderless: '',
}

function identityLine(set: PokemonSet, dex: Dex): string {
  const species = speciesLabel(dex, set.species)
  const named = set.nickname === null ? species : `${set.nickname} (${species})`
  const gender = set.gender === null ? '' : GENDER_MARK[set.gender]
  const item = set.item === null ? '' : ` @ ${itemLabel(dex, set.item)}`
  return `${named}${gender}${item}`
}

/** Non-default stats only, in canonical HP/Atk/Def/SpA/SpD/Spe order. */
function spreadLine(spread: StatSpread, atDefault: number): string | null {
  const parts = STATS.filter((stat: Stat) => spread[stat] !== atDefault).map(
    (stat) => `${spread[stat]} ${STAT_LABEL[stat]}`,
  )
  return parts.length === 0 ? null : parts.join(' / ')
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function natureLabel(nature: Nature): string {
  return capitalize(nature)
}

function teraLabel(type: TeraType): string {
  return capitalize(type)
}

function speciesLabel(dex: Dex, id: SpeciesId): string {
  const species = dex.species(id)
  if (species !== undefined) {
    if (labelResolvesTo(species.name, id)) return species.name
    const full = displayName(species)
    if (labelResolvesTo(full, id)) return full
  }
  return labelFromSlug(id, '-')
}

function moveLabel(dex: Dex, id: MoveId): string {
  const move = dex.move(id)
  return move !== undefined && labelResolvesTo(move.name, id) ? move.name : labelFromSlug(id, ' ')
}

function itemLabel(dex: Dex, id: ItemId): string {
  const item = dex.item(id)
  return item !== undefined && labelResolvesTo(item.name, id) ? item.name : labelFromSlug(id, ' ')
}

function abilityLabel(dex: Dex, id: AbilityId): string {
  const ability = dex.ability(id)
  return ability !== undefined && labelResolvesTo(ability.name, id)
    ? ability.name
    : labelFromSlug(id, ' ')
}
