/**
 * What a form can learn in generation IX.
 *
 * PokéAPI nests one entry per move per version group per method, so Garchomp
 * lists Earthquake once with a dozen `version_group_details` under it — level
 * 43 in Diamond, TM26 in Platinum, and so on. The dataset needs one flat
 * answer: can this form use this move in this generation, yes or no. So the
 * details are flattened, filtered to the generation, and the move name is
 * kept once.
 *
 * By generation, never by method. Egg chains, tutors, event moves and version
 * exclusivity are not modelled and the interface says so — see the honesty
 * rules in CLAUDE.md.
 */

import type { MoveId } from '@spc/core'
import { moveId } from '@spc/core'
import type { PokemonResponse } from '../pokeapi/schema'

/**
 * The Scarlet and Violet family.
 *
 * PokéAPI files Legends: Z-A, Mega Dimension and Champions under generation IX
 * too. They are a different battle system with a different move pool, and
 * every format this app ships plays the SV games, so the dataset draws the
 * line here rather than at the generation number.
 */
export const GEN_9_VERSION_GROUPS: ReadonlySet<string> = new Set([
  'scarlet-violet',
  'the-teal-mask',
  'the-indigo-disk',
  /**
   * PokéAPI files some SV-legal moves only under `champions`. Kingambit's
   * Sucker Punch is the case that caught this: it is a standard OU set, and
   * without this entry the legality panel called a real team illegal. Falsely
   * accusing a legal team is a worse failure than being slightly permissive,
   * so the line is drawn here.
   */
  'champions',
])

export function learnsetOf(
  pokemon: PokemonResponse,
  versionGroups: ReadonlySet<string> = GEN_9_VERSION_GROUPS,
): readonly MoveId[] {
  const names = new Set<string>()
  for (const entry of pokemon.moves) {
    const learnable = entry.version_group_details.some((detail) =>
      versionGroups.has(detail.version_group.name),
    )
    if (learnable) names.add(entry.move.name)
  }
  return [...names].sort().map(moveId)
}
