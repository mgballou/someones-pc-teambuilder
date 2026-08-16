/**
 * The shipping formats.
 *
 * `Dex` asks for formats and PokéAPI has never heard of one — it has no tiers,
 * no regulations and no banlists. So these are hand-written, every one carries
 * a `source` naming the authority and the date it was last checked, and the
 * interface shows that next to every verdict. See the honesty rules.
 *
 * `restrictedSpecies` is not hand-listed. A format declares that it caps the
 * restricted tier and the dataset supplies which species those are, so adding
 * a new box legendary is an ingest away rather than an edit here.
 */

import type { AbilityId, Format, ItemId, LegalityRuleset, MoveId, Species, SpeciesId } from '@spc/core'
import { abilityId, EMPTY_LEGALITY, formatId, itemId, moveId, speciesId } from '@spc/core'

/** Last checked against the published rules on this date. */
const VERIFIED_ON = '2026-08-16'

export function curatedFormats(allSpecies: readonly Species[]): readonly Format[] {
  const restricted = allSpecies
    .filter((species) => species.classification === 'restricted')
    .map((species) => species.id)

  return [
    vgc({
      id: 'vgc-2026-reg-h',
      name: 'VGC 2026 Regulation H',
      shortName: 'Reg H',
      legality: {
        ...EMPTY_LEGALITY,
        bannedClassifications: [
          'legendary',
          'sub-legendary',
          'mythical',
          'restricted',
          'paradox',
        ],
      },
      citation: 'Play! Pokémon VGC Regulation H, no legendaries and no paradoxes.',
    }),
    vgc({
      id: 'vgc-2026-reg-g',
      name: 'VGC 2026 Regulation G',
      shortName: 'Reg G',
      legality: cappedRestricted(restricted),
      citation: 'Play! Pokémon VGC Regulation G, two restricted Pokémon per team.',
    }),
    vgc({
      id: 'vgc-2026-reg-i',
      name: 'VGC 2026 Regulation I',
      shortName: 'Reg I',
      legality: cappedRestricted(restricted),
      citation: 'Play! Pokémon VGC Regulation I, two restricted Pokémon per team.',
    }),
    {
      id: formatId('gen9-ou'),
      name: 'Smogon Gen 9 OU',
      shortName: 'OU',
      generation: 9,
      style: 'singles',
      teamSize: 6,
      bringSize: 6,
      level: { kind: 'capped', max: 100 },
      gimmick: 'terastal',
      clauses: ['species', 'sleep', 'evasion', 'ohko', 'endless-battle'],
      legality: {
        ...EMPTY_LEGALITY,
        bannedClassifications: ['mythical', 'restricted'],
        bannedSpecies: namedSpecies([
          'annihilape',
          'baxcalibur',
          'chi-yu',
          'chien-pao',
          'darkrai',
          'deoxys-speed',
          'espathra',
          'flutter-mane',
          'gholdengo',
          'iron-bundle',
          'kingambit',
          'landorus-incarnate',
          'palafin-hero',
          'ursaluna',
          'ursaluna-bloodmoon',
          'volcarona',
        ]),
        bannedItems: namedItems(['kings-rock', 'razor-fang']),
        bannedAbilities: namedAbilities(['arena-trap', 'moody', 'shadow-tag']),
        bannedMoves: namedMoves(['last-respects', 'shed-tail']),
      },
      source: {
        authority: 'smogon',
        citation: 'Smogon SV OU banlist, transcribed by hand and not read live.',
        verifiedOn: VERIFIED_ON,
      },
    },
    {
      id: formatId('gen9-ubers'),
      name: 'Smogon Gen 9 Ubers',
      shortName: 'Ubers',
      generation: 9,
      style: 'singles',
      teamSize: 6,
      bringSize: 6,
      level: { kind: 'capped', max: 100 },
      gimmick: 'terastal',
      clauses: ['species', 'sleep', 'evasion', 'endless-battle'],
      legality: {
        ...EMPTY_LEGALITY,
        bannedSpecies: namedSpecies(['mewtwo-mega-x', 'mewtwo-mega-y', 'rayquaza-mega']),
        bannedMoves: namedMoves(['fissure', 'guillotine', 'horn-drill', 'sheer-cold']),
        bannedAbilities: namedAbilities(['moody']),
      },
      source: {
        authority: 'smogon',
        citation: 'Smogon SV Ubers banlist, transcribed by hand and not read live.',
        verifiedOn: VERIFIED_ON,
      },
    },
    {
      id: formatId('unrestricted'),
      name: 'Unrestricted',
      shortName: 'Open',
      generation: 9,
      style: 'singles',
      teamSize: 6,
      bringSize: 6,
      level: { kind: 'capped', max: 100 },
      gimmick: 'terastal',
      clauses: [],
      legality: EMPTY_LEGALITY,
      source: {
        authority: 'custom',
        citation: 'No rules. For working out what a set does before deciding where it plays.',
        verifiedOn: VERIFIED_ON,
      },
    },
  ]
}

type VgcInput = {
  readonly id: string
  readonly name: string
  readonly shortName: string
  readonly legality: LegalityRuleset
  readonly citation: string
}

function vgc({ id, name, shortName, legality, citation }: VgcInput): Format {
  return {
    id: formatId(id),
    name,
    shortName,
    generation: 9,
    style: 'doubles',
    teamSize: 6,
    bringSize: 4,
    level: { kind: 'fixed', level: 50 },
    gimmick: 'terastal',
    clauses: ['species', 'item'],
    legality,
    source: { authority: 'vgc', citation, verifiedOn: VERIFIED_ON },
  }
}

function cappedRestricted(restricted: readonly SpeciesId[]): LegalityRuleset {
  return {
    ...EMPTY_LEGALITY,
    bannedClassifications: ['mythical'],
    restrictedSpecies: restricted,
    maxRestricted: 2,
  }
}

function namedSpecies(names: readonly string[]): readonly SpeciesId[] {
  return names.map(speciesId)
}

function namedItems(names: readonly string[]): readonly ItemId[] {
  return names.map(itemId)
}

function namedMoves(names: readonly string[]): readonly MoveId[] {
  return names.map(moveId)
}

function namedAbilities(names: readonly string[]): readonly AbilityId[] {
  return names.map(abilityId)
}
