/**
 * The sandbox format.
 *
 * Nothing is banned, no clause applies, and the level cap is the game's own.
 * It exists so that a person can calculate against a match-up no real format
 * allows without the interface telling them their team is broken.
 *
 * Its authority is `custom`, because it has none. The spec calls its style
 * "either"; `BattleStyle` has no such member, so it declares singles and the
 * damage calculator will not apply the spread reduction here. Anyone who wants
 * doubles maths should use a VGC regulation.
 */

import { EMPTY_LEGALITY, type Format } from '../format'
import { formatId } from '../ids'

/** The day this sandbox was defined. It answers to nobody, so it never ages. */
const DEFINED_ON = '2026-08-16'

export const unrestricted: Format = {
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
  /**
   * The one format that admits a species Generation 9 does not hold. Reading
   * Mega Rayquaza's damage against a Pidgeot is exactly what a sandbox is for,
   * and the honest place to say so is here, as a rule this format declares,
   * rather than as a special case inside the legality check.
   */
  legality: { ...EMPTY_LEGALITY, allowsUnavailableSpecies: true },
  source: {
    authority: 'custom',
    citation: [
      'A sandbox defined by this app, with no outside authority behind it. Nothing is banned',
      'and no clause applies, so a legality verdict here says only that a set is internally',
      'coherent. It is not a format anyone plays.',
    ].join(' '),
    verifiedOn: DEFINED_ON,
    /**
     * Never stale. The other formats age because an outside authority moves
     * without telling this app; this one is defined here, so there is nothing
     * for it to fall behind, and saying "last checked" of it would be theatre.
     */
    staleAfterDays: null,
  },
}
