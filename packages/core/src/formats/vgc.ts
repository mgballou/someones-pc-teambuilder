/**
 * The shipped VGC regulations.
 *
 * Three regulations differ only in their data: which categories are banned, and
 * how many restricted Pokémon a team may hold. Nothing here is a branch on a
 * format id, and adding Regulation J is adding a record to this file.
 *
 * Every ruleset below is hand-curated. PokéAPI has no concept of a regulation,
 * so there is no way to derive one — see the honesty rules in CLAUDE.md. The
 * `citation` on each format says exactly how much authority it has, and the
 * interface shows that string next to every verdict.
 */

import { EMPTY_LEGALITY, type Format, type FormatSource } from '../format'
import { formatId, speciesId, type SpeciesId } from '../ids'
import type { SpeciesClassification } from '../species'

/** The date every ruleset in this package was last read against its authority. */
export const VERIFIED_ON = '2026-08-16'

/**
 * Every classification that is not an ordinary Pokémon.
 *
 * Regulation H is a category ban rather than a list of names, which is the
 * whole reason `bannedClassifications` exists.
 */
const NON_ORDINARY: readonly SpeciesClassification[] = [
  'legendary',
  'mythical',
  'sub-legendary',
  'restricted',
  'paradox',
  'ultra-beast',
  'mega',
  'totem',
]

/**
 * Categories no VGC regulation has ever allowed in Generation 9. Mythicals are
 * barred outright; Mega and Totem forms do not exist in Scarlet and Violet, and
 * are listed so that a dataset that carries them cannot leak one in.
 */
const NEVER_IN_VGC: readonly SpeciesClassification[] = ['mythical', 'mega', 'totem']

/**
 * The restricted tier — the box legendaries a team may hold a capped number of.
 *
 * Restricted is not banned. Regulation G allows two of these and Regulation I
 * allows one, which is `maxRestricted`, not `bannedSpecies`.
 *
 * Form ids follow the dataset's slug convention. Where a species has forms that
 * are separately legal, each form is listed, because Calyrex-Ice and Calyrex are
 * two different Pokémon.
 */
export const VGC_RESTRICTED_SPECIES: readonly SpeciesId[] = [
  'mewtwo',
  'lugia',
  'ho-oh',
  'kyogre',
  'groudon',
  'rayquaza',
  'dialga',
  'dialga-origin',
  'palkia',
  'palkia-origin',
  'giratina-altered',
  'giratina-origin',
  'reshiram',
  'zekrom',
  'kyurem',
  'kyurem-black',
  'kyurem-white',
  'cosmog',
  'cosmoem',
  'solgaleo',
  'lunala',
  'necrozma',
  'necrozma-dusk',
  'necrozma-dawn',
  'zacian',
  'zacian-crowned',
  'zamazenta',
  'zamazenta-crowned',
  'eternatus',
  'calyrex',
  'calyrex-ice',
  'calyrex-shadow',
  'koraidon',
  'miraidon',
  'terapagos',
  'terapagos-terastal',
  'terapagos-stellar',
].map(speciesId)

/**
 * Named bans that no category covers.
 *
 * Bloodmoon Ursaluna is an ordinary Pokémon by classification and was barred
 * from Regulation H by name, which is exactly the case `bannedSpecies` exists
 * for.
 */
const REGULATION_H_NAMED_BANS: readonly SpeciesId[] = ['ursaluna-bloodmoon'].map(speciesId)

function vgcSource(regulation: string, restrictedNote: string): FormatSource {
  return {
    authority: 'vgc',
    citation: [
      `Play! Pokémon VGC ${regulation} rules, transcribed by hand from the published`,
      `regulation sheet. ${restrictedNote}`,
      'This is a curated snapshot, not a live feed. It may lag an errata or a mid-season',
      'correction, and the restricted list in particular is the part most likely to be out',
      'of date. Check the official rules before entering a tournament.',
    ].join(' '),
    verifiedOn: VERIFIED_ON,
  }
}

/**
 * Regulation H — no legendary, mythical, sub-legendary or paradox Pokémon at
 * all. The most restrictive regulation, and the reason category bans exist.
 */
export const regulationH: Format = {
  id: formatId('vgc-2026-reg-h'),
  name: 'VGC 2026 Regulation H',
  shortName: 'Reg H',
  generation: 9,
  style: 'doubles',
  teamSize: 6,
  bringSize: 4,
  level: { kind: 'fixed', level: 50 },
  gimmick: 'terastal',
  clauses: ['species', 'item'],
  legality: {
    ...EMPTY_LEGALITY,
    bannedClassifications: NON_ORDINARY,
    bannedSpecies: REGULATION_H_NAMED_BANS,
  },
  source: vgcSource(
    'Regulation H',
    'Every legendary, mythical, sub-legendary, paradox and Ultra Beast is barred, so no restricted allowance applies.',
  ),
}

/**
 * Regulation G — the open regulation. Two restricted Pokémon per team, and
 * everything else in the transferable dex except mythicals.
 */
export const regulationG: Format = {
  id: formatId('vgc-2026-reg-g'),
  name: 'VGC 2026 Regulation G',
  shortName: 'Reg G',
  generation: 9,
  style: 'doubles',
  teamSize: 6,
  bringSize: 4,
  level: { kind: 'fixed', level: 50 },
  gimmick: 'terastal',
  clauses: ['species', 'item'],
  legality: {
    ...EMPTY_LEGALITY,
    bannedClassifications: NEVER_IN_VGC,
    restrictedSpecies: VGC_RESTRICTED_SPECIES,
    maxRestricted: 2,
  },
  source: vgcSource('Regulation G', 'Two restricted Pokémon per team.'),
}

/**
 * Regulation I — the same pool as Regulation G with the restricted allowance
 * cut to one. The difference between the two formats is a single number, which
 * is the point of modelling the cap as data.
 */
export const regulationI: Format = {
  id: formatId('vgc-2026-reg-i'),
  name: 'VGC 2026 Regulation I',
  shortName: 'Reg I',
  generation: 9,
  style: 'doubles',
  teamSize: 6,
  bringSize: 4,
  level: { kind: 'fixed', level: 50 },
  gimmick: 'terastal',
  clauses: ['species', 'item'],
  legality: {
    ...EMPTY_LEGALITY,
    bannedClassifications: NEVER_IN_VGC,
    restrictedSpecies: VGC_RESTRICTED_SPECIES,
    maxRestricted: 1,
  },
  source: vgcSource('Regulation I', 'One restricted Pokémon per team.'),
}
