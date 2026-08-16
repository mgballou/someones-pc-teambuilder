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
import { VERIFIED_ON } from './vgc'

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
  legality: EMPTY_LEGALITY,
  source: {
    authority: 'custom',
    citation: [
      'A sandbox defined by this app, with no outside authority behind it. Nothing is banned',
      'and no clause applies, so a legality verdict here says only that a set is internally',
      'coherent. It is not a format anyone plays.',
    ].join(' '),
    verifiedOn: VERIFIED_ON,
  },
}
