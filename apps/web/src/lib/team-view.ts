import 'server-only'

import { notFound } from 'next/navigation'
import type { Format, PokemonSet, PokemonType, Team, TeamId } from '@spc/core'
import {
  analyzeCoverage,
  analyzeSpeed,
  computeSpread,
  filledMoves,
  validateTeam,
  violationSetIds,
} from '@spc/core'
import { currentUser } from '../auth/session'
import { getTeam } from '../data/teams'
import { dex, displayNameOf } from './dex'
import type { MoveView, SetView, TeamHeaderView } from './view'

/**
 * One place that turns "a team id in the URL" into everything the panels need.
 *
 * Every page under `/teams/[teamId]` calls this, so authentication, ownership,
 * the 404 and the analysis all happen once and identically. Panels receive
 * plain values and do no work of their own.
 */

export type LoadedTeam = {
  readonly team: Team
  readonly format: Format
  readonly header: TeamHeaderView
  readonly views: readonly SetView[]
}

export async function loadTeam(teamId: string): Promise<LoadedTeam> {
  const user = await currentUser(new Date())
  if (user === null) notFound()

  const team = await getTeam(user.id, teamId as TeamId)
  if (team === null) notFound()

  const catalog = dex()
  const format = catalog.format(team.format)
  if (format === undefined) notFound()

  const legality = validateTeam({ team, format, dex: catalog })
  const coverage = analyzeCoverage({ team, dex: catalog })

  const problemsBySet = new Map<string, string[]>()
  for (const violation of legality.violations) {
    for (const setId of violationSetIds(violation)) {
      const existing = problemsBySet.get(setId) ?? []
      existing.push(violation.message)
      problemsBySet.set(setId, existing)
    }
  }

  const views = team.members.map((set) => toSetView(set, format, problemsBySet.get(set.id) ?? []))

  return {
    team,
    format,
    views,
    header: {
      id: team.id,
      name: team.name,
      formatId: format.id,
      formatName: format.name,
      formatShortName: format.shortName,
      teamSize: format.teamSize,
      memberCount: team.members.length,
      violationCount: legality.violations.length,
      sharedWeaknessCount: coverage.defensive.sharedWeaknesses.length,
    },
  }
}

function toSetView(set: PokemonSet, format: Format, problems: readonly string[]): SetView {
  const catalog = dex()
  const species = catalog.species(set.species)

  /**
   * A set can outlive the dataset — someone imports a paste, the dataset is
   * rebuilt, a form is renamed. The card still has to render, and it has to
   * say what is wrong rather than crashing the page or quietly showing a
   * blank. ui-sensibility.md §12.1.
   */
  if (species === undefined) {
    return {
      id: set.id,
      set,
      speciesName: set.species,
      dexNumber: 0,
      types: [],
      spriteUrl: UNKNOWN_SPRITE_KEY,
      abilityName: null,
      itemName: null,
      teraType: set.teraType,
      stats: ZERO_STATS,
      baseStats: ZERO_STATS,
      moves: [null, null, null, null],
      problems: [...problems, `${set.species} is not in the dataset.`],
    }
  }

  const level = format.level.kind === 'fixed' ? format.level.level : set.level
  const stats = computeSpread({
    base: species.baseStats,
    ivs: set.ivs,
    evs: set.evs,
    level,
    nature: set.nature,
  })

  const ability = set.ability === null ? null : catalog.ability(set.ability)
  const item = set.item === null ? null : catalog.item(set.item)

  return {
    id: set.id,
    set,
    speciesName: displayNameOf(species),
    dexNumber: species.dexNumber,
    types: species.types as readonly PokemonType[],
    spriteUrl: species.spriteKey,
    abilityName: ability?.name ?? null,
    itemName: item?.name ?? null,
    teraType: set.teraType,
    stats,
    baseStats: species.baseStats,
    moves: set.moves.map(toMoveView),
    problems,
  }
}

function toMoveView(moveId: PokemonSet['moves'][number]): MoveView | null {
  if (moveId === null) return null
  const move = dex().move(moveId)
  if (move === undefined) return null
  return {
    id: move.id,
    name: move.name,
    type: move.type,
    category: move.category,
    basePower: move.basePower,
    accuracy: move.accuracy,
  }
}

/** PokéAPI has no sprite at 0, so this reliably renders the missing-image box. */
const UNKNOWN_SPRITE_KEY = '0'

const ZERO_STATS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as const

export { analyzeCoverage, analyzeSpeed, validateTeam, filledMoves }
