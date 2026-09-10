/**
 * The shipped Smogon singles tiers.
 *
 * Smogon bans by name, one Pokémon at a time, which is the other half of why
 * `LegalityRuleset` carries both a category list and a name list. A tier is a
 * list of names plus a handful of clauses, and nothing else about it is special.
 *
 * These lists are transcribed by hand. Smogon retiers on a monthly cycle and
 * this package has no way to read the live list, so the citation says so and
 * the interface shows it next to every verdict.
 */

import { EMPTY_LEGALITY, type Format, type FormatSource } from '../format'
import { abilityId, formatId, itemId, moveId, speciesId } from '../ids'
import type { AbilityId, ItemId, MoveId, SpeciesId } from '../ids'

/**
 * The date the ban lists below were last read against smogon.com.
 *
 * Its own constant, not the VGC one. Smogon retiers on a cadence Play! Pokémon
 * has nothing to do with, and a single date shared between the two was true of
 * neither.
 */
export const SMOGON_VERIFIED_ON = '2026-08-16'

/** Smogon retiers monthly, so a transcription is worth a month and no longer. */
export const SMOGON_STALE_AFTER_DAYS = 31

/**
 * Banned by the Evasion Items Clause in every Smogon singles tier. Modelled as
 * items rather than as a clause because the `Clause` union's `evasion` entry
 * covers moves.
 */
const EVASION_ITEMS: readonly ItemId[] = ['bright-powder', 'lax-incense'].map(itemId)

/**
 * Everything in the Uber tier and above, and so barred from OU.
 *
 * Restricted to entries the transcription is confident about. A Pokémon that
 * sits on the edge of a suspect test is left off rather than guessed at — a
 * legality checker that invents a ban is worse than one that misses it, because
 * the miss is visible when the team is rejected and the invention never is.
 *
 * That was the argument for the gaps; it did not survive contact with the list.
 * Nineteen Uber species walked into OU, and none of them was a borderline call:
 * Sneasler, Espathra, Iron Bundle, Roaring Moon, Archaludon, Gouging Fire,
 * Rapid Strike Urshifu, Hearthflame Ogerpon and Original Magearna were simply
 * missing, and the other ten were an id that matched nothing.
 *
 * Two id shapes are worth knowing before adding to this list. A Pokémon whose
 * only forms are suffixed has no bare id — the dataset holds `palafin-zero` and
 * `palafin-hero`, never `palafin`, and the bare entry that used to sit here
 * banned nothing at all. And the four Koraidon and four Miraidon ride forms are
 * separate records with the box legendary's stats, so a ban has to name each.
 * `registry-ids.test.ts` in `@spc/dex` now fails on an id no species has, which
 * is the only reason this can be trusted.
 */
const OU_BANNED_SPECIES: readonly SpeciesId[] = [
  'annihilape',
  'arceus',
  'archaludon',
  'baxcalibur',
  'calyrex-ice',
  'calyrex-shadow',
  'chi-yu',
  'chien-pao',
  'deoxys-attack',
  'deoxys-normal',
  'deoxys-speed',
  'dialga',
  'dialga-origin',
  'espathra',
  'eternatus',
  'flutter-mane',
  'giratina-altered',
  'giratina-origin',
  'gouging-fire',
  'groudon',
  'ho-oh',
  'iron-bundle',
  'koraidon',
  'koraidon-gliding-build',
  'koraidon-limited-build',
  'koraidon-sprinting-build',
  'koraidon-swimming-build',
  'kyogre',
  'kyurem',
  'kyurem-black',
  'kyurem-white',
  'landorus-incarnate',
  'lugia',
  'lunala',
  'magearna',
  'magearna-original',
  'mewtwo',
  'miraidon',
  'miraidon-aquatic-mode',
  'miraidon-drive-mode',
  'miraidon-glide-mode',
  'miraidon-low-power-mode',
  'necrozma-dawn',
  'necrozma-dusk',
  'ogerpon-hearthflame-mask',
  'palafin-hero',
  'palafin-zero',
  'palkia',
  'palkia-origin',
  'rayquaza',
  'reshiram',
  'roaring-moon',
  'shaymin-sky',
  'sneasler',
  'solgaleo',
  'spectrier',
  'terapagos',
  'terapagos-stellar',
  'terapagos-terastal',
  'ursaluna-bloodmoon',
  'urshifu-rapid-strike',
  'urshifu-single-strike',
  'volcarona',
  'zacian',
  'zacian-crowned',
  'zamazenta',
  'zamazenta-crowned',
  'zekrom',
  'zygarde-complete',
].map(speciesId)

const OU_BANNED_ABILITIES: readonly AbilityId[] = ['moody', 'arena-trap', 'shadow-tag'].map(
  abilityId,
)

const OU_BANNED_MOVES: readonly MoveId[] = ['last-respects', 'shed-tail', 'baton-pass'].map(moveId)

const smogonSource = (tier: string, coverage: string): FormatSource => ({
  authority: 'smogon',
  citation: [
    `Smogon Generation 9 ${tier} ruleset, transcribed by hand from the tier's public ban list.`,
    coverage,
    'Smogon retiers monthly and this app cannot read the live list, so treat this as a',
    'snapshot taken on the date above rather than as the current tier. Anything decided by',
    'a suspect test since then is missing. Check smogon.com before relying on a verdict.',
  ].join(' '),
  verifiedOn: SMOGON_VERIFIED_ON,
  staleAfterDays: SMOGON_STALE_AFTER_DAYS,
})

/**
 * Generation 9 OU. Terastallization is legal here; the tier bans by name and
 * leans on clauses for everything else.
 */
export const gen9Ou: Format = {
  id: formatId('gen9-ou'),
  name: 'Smogon Gen 9 OU',
  shortName: 'OU',
  generation: 9,
  style: 'singles',
  teamSize: 6,
  bringSize: 6,
  level: { kind: 'capped', max: 100 },
  gimmick: 'terastal',
  clauses: ['species', 'sleep', 'evasion', 'ohko', 'endless-battle', 'nickname'],
  legality: {
    ...EMPTY_LEGALITY,
    bannedSpecies: OU_BANNED_SPECIES,
    bannedAbilities: OU_BANNED_ABILITIES,
    bannedMoves: OU_BANNED_MOVES,
    bannedItems: EVASION_ITEMS,
  },
  source: smogonSource(
    'OU',
    'The species list holds the Uber tier and above, checked against the tier as published on the date above; entries under active suspect discussion are left off rather than guessed at.',
  ),
}

/**
 * Generation 9 Ubers. Every species is legal — the tier exists so that the ones
 * OU bars have somewhere to play — and only a short list of moves, abilities and
 * items is barred on top of the clauses.
 */
export const gen9Ubers: Format = {
  id: formatId('gen9-ubers'),
  name: 'Smogon Gen 9 Ubers',
  shortName: 'Ubers',
  generation: 9,
  style: 'singles',
  teamSize: 6,
  bringSize: 6,
  level: { kind: 'capped', max: 100 },
  gimmick: 'terastal',
  clauses: ['species', 'sleep', 'evasion', 'ohko', 'endless-battle', 'nickname'],
  legality: {
    ...EMPTY_LEGALITY,
    bannedAbilities: [abilityId('moody')],
    bannedMoves: [moveId('last-respects')],
    bannedItems: EVASION_ITEMS,
  },
  source: smogonSource(
    'Ubers',
    'No species is banned. The move and ability list is short and is the part of this transcription with the least confidence behind it.',
  ),
}
