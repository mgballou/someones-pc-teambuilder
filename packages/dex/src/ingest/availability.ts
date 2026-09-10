/**
 * Which generations' games actually hold a form.
 *
 * The dataset carries all 1,351 forms PokéAPI knows, and 482 of them cannot be
 * used in Scarlet and Violet at all — every Mega Evolution, every Totem form,
 * and three hundred and seventy-three the National Dex left behind. Nothing
 * in a species record said so, so nothing downstream could ask, and a team of
 * Butterfree and Pidgeot came back legal.
 *
 * PokéAPI has no "this form is in these games" field. What it has is a move
 * list keyed by version group, and a form the games hold learns at least one
 * move in them — a level-up move if nothing else. So availability is read off
 * the same payload the learnset is, against a narrower set of version groups.
 *
 * The same three version groups `learnsets.ts` reads, and for the same reason:
 * `champions` carries a move list for 129 forms that are not in Scarlet and
 * Violet at all, Pidgeot among them, and reading one of those as presence is
 * the whole bug. Nothing here reads it, and since the evolution chain replaced
 * it in `learnsets.ts`, nothing anywhere does.
 */

import type { PokemonResponse } from '../pokeapi/schema'
import { AVAILABLE_IN_GEN_9, UNAVAILABLE_IN_GEN_9 } from './curated/availability'

export const GENERATION_9 = 9

/**
 * The Scarlet and Violet games and their two expansions.
 *
 * PokéAPI files Teal Mask and Indigo Disk moves under `scarlet-violet` in
 * practice, so the other two entries never match today. They are here because
 * the version group a move is filed under is PokéAPI's choice to change, and
 * a form that appeared only under one of them would otherwise read as absent.
 */
export const SCARLET_VIOLET_VERSION_GROUPS: ReadonlySet<string> = new Set([
  'scarlet-violet',
  'the-teal-mask',
  'the-indigo-disk',
])

/**
 * The generations this form can be used in, ascending.
 *
 * One entry or none, because the ingest reads Generation 9 and nothing else.
 * Returned as a list so that adding Generation 10 is a change to this function
 * rather than to every type between here and the legality check.
 */
export function availableGenerations(
  pokemon: PokemonResponse,
  versionGroups: ReadonlySet<string> = SCARLET_VIOLET_VERSION_GROUPS,
): readonly number[] {
  return inScarletViolet(pokemon, versionGroups) ? [GENERATION_9] : []
}

function inScarletViolet(pokemon: PokemonResponse, versionGroups: ReadonlySet<string>): boolean {
  if (AVAILABLE_IN_GEN_9.has(pokemon.name)) return true
  if (UNAVAILABLE_IN_GEN_9.has(pokemon.name)) return false
  return pokemon.moves.some((entry) =>
    entry.version_group_details.some((detail) => versionGroups.has(detail.version_group.name)),
  )
}
