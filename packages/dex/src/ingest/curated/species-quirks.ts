/**
 * Per-form facts that only exist at the form level, where PokéAPI only ever
 * answers at the species level.
 *
 * `/pokemon-species` says whether *Basculin* evolves. It cannot say that only
 * the White-Striped form becomes Basculegion, and Eviolite reads exactly that
 * distinction. Same story for Terastallization, which two families cannot do
 * at all.
 *
 * Keys are `pokemon` names — forms, not species.
 */

/**
 * Forms whose species evolves but which cannot themselves evolve.
 *
 * Gigantamax and Totem forms are handled by rule rather than listed: neither
 * has ever been able to evolve.
 */
export const NON_EVOLVING_FORMS: ReadonlySet<string> = new Set([
  'basculin-red-striped',
  'basculin-blue-striped',
  'floette-eternal',
  'pichu-spiky-eared',
  'pikachu-rock-star',
  'pikachu-belle',
  'pikachu-pop-star',
  'pikachu-phd',
  'pikachu-libre',
  'pikachu-cosplay',
  'pikachu-original-cap',
  'pikachu-hoenn-cap',
  'pikachu-sinnoh-cap',
  'pikachu-unova-cap',
  'pikachu-kalos-cap',
  'pikachu-alola-cap',
  'pikachu-partner-cap',
  'pikachu-starter',
  'pikachu-world-cap',
  'eevee-starter',
])

/**
 * Families that cannot Terastallize.
 *
 * Terapagos is already a Tera Pokémon and Ogerpon's Terastallization is bound
 * to its mask, so neither takes a chosen Tera type. Mega forms and Gigantamax
 * forms are excluded by rule rather than listed, since a format never has both
 * gimmicks on at once.
 */
export const NO_TERASTAL_FORMS: ReadonlySet<string> = new Set([
  'terapagos',
  'terapagos-terastal',
  'terapagos-stellar',
  'ogerpon',
  'ogerpon-wellspring-mask',
  'ogerpon-hearthflame-mask',
  'ogerpon-cornerstone-mask',
])
