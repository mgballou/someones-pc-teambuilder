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
 *
 * One thing *is* modelled, because the games make it unavoidable: a Pokémon
 * carries the moves it knew before it evolved. See `withInheritedMoves`.
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
 *
 * `champions` used to be in this set. It was added for Kingambit's Sucker
 * Punch, which the legality panel called illegal on a standard set, and it did
 * fix that — along with 1,359 other pairs it should not have. Pokémon Champions
 * restores a large machine list that Scarlet and Violet cut, and PokéAPI files
 * the whole of it under a single `train` method with no way to tell one entry
 * from another: Round on 155 SV forms, Snore on 153, Iron Tail on 58, Payback
 * on 43, none of them reachable in Scarlet and Violet.
 *
 * The Sucker Punch gap was never about the version group. Pawniard learns
 * Sucker Punch as an egg move in Scarlet and Violet; Bisharp and Kingambit
 * carry no entry for it at all, because PokéAPI files an inherited move only on
 * the form that learns it. The evolution chain is the fix, and it is below.
 */
export const GEN_9_VERSION_GROUPS: ReadonlySet<string> = new Set([
  'scarlet-violet',
  'the-teal-mask',
  'the-indigo-disk',
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

/** One form's own learnset, before its evolution chain is folded in. */
export type FormLearnset = {
  /** PokéAPI's `/pokemon` name, which is the dataset's species id. */
  readonly form: string
  /** PokéAPI's `/pokemon-species` name, which a family of forms shares. */
  readonly species: string
  readonly isDefault: boolean
  readonly moves: readonly MoveId[]
}

/**
 * Fold every pre-evolution's learnset into the form that evolves from it.
 *
 * A Pokémon keeps what it knew before it evolved, so anything Pawniard can
 * learn in Scarlet and Violet, Kingambit can use there. PokéAPI does not say
 * so: it files a move on the form that learns it and nowhere else, which is why
 * Sucker Punch sits on Pawniard alone and why Kingambit's standard set read as
 * illegal.
 *
 * This is method-independent and true of the games by construction, which is
 * what makes it a safe thing to model when nothing else about method is.
 *
 * `preEvolutionOf` maps a species name to the species it evolves from. Species,
 * not form — that is the only direction PokéAPI answers. A regional form takes
 * the pre-evolution that carries the same suffix where one exists, so Galarian
 * Slowbro inherits from Galarian Slowpoke and Kantonian Persian does not
 * inherit from Alolan Meowth; otherwise it takes the default form.
 */
export function withInheritedMoves(
  forms: readonly FormLearnset[],
  preEvolutionOf: ReadonlyMap<string, string>,
): readonly FormLearnset[] {
  const byForm = new Map(forms.map((entry) => [entry.form, entry]))
  const defaultForm = new Map(
    forms.filter((entry) => entry.isDefault).map((entry) => [entry.species, entry.form]),
  )

  const preEvolutionForm = (form: string): string | undefined => {
    const entry = byForm.get(form)
    if (entry === undefined) return undefined
    const parent = preEvolutionOf.get(entry.species)
    if (parent === undefined) return undefined
    const suffix = entry.form.startsWith(`${entry.species}-`)
      ? entry.form.slice(entry.species.length + 1)
      : ''
    const sameSuffix = `${parent}-${suffix}`
    if (suffix !== '' && byForm.has(sameSuffix)) return sameSuffix
    return defaultForm.get(parent)
  }

  return forms.map((entry) => {
    const moves = new Set<string>(entry.moves)
    /**
     * `walked` guards the loop rather than the data. Nothing in PokéAPI evolves
     * into its own ancestor today, and an ingest that hangs on the day one does
     * would be very hard to read.
     */
    const walked = new Set<string>([entry.form])
    let current = preEvolutionForm(entry.form)
    while (current !== undefined && !walked.has(current)) {
      walked.add(current)
      for (const move of byForm.get(current)?.moves ?? []) moves.add(move)
      current = preEvolutionForm(current)
    }
    return { ...entry, moves: [...moves].sort().map(moveId) }
  })
}
