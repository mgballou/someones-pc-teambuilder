/**
 * Moves whose base power is not a constant.
 *
 * PokéAPI reports `power: null` for most of these and a placeholder `1` for a
 * few, and says nothing about *why*. The calculator needs the rule, not the
 * absence of a number, so the rule is written down here and everything else
 * that arrives with a null power falls through to `{ kind: 'other' }`.
 *
 * This table is only half the subject. A move that *does* print a power can
 * still have that power changed in battle — Knock Off, Facade, Weather Ball —
 * and those are `CONDITIONAL_POWER` in `@spc/core`, not entries here. Falling
 * out of this table means "PokéAPI printed a number", and nothing else.
 */

import type { VariablePower } from '@spc/core'

export const CURATED_VARIABLE_POWER: Readonly<Record<string, VariablePower>> = {
  'grass-knot': { kind: 'weight-of-target' },
  'low-kick': { kind: 'weight-of-target' },

  'heat-crash': { kind: 'weight-ratio' },
  'heavy-slam': { kind: 'weight-ratio' },

  'electro-ball': { kind: 'speed-ratio' },
  'gyro-ball': { kind: 'speed-ratio' },

  eruption: { kind: 'user-hp-ratio' },
  'water-spout': { kind: 'user-hp-ratio' },
  'dragon-energy': { kind: 'user-hp-ratio' },

  'crush-grip': { kind: 'target-hp-ratio' },
  'wring-out': { kind: 'target-hp-ratio' },
  'hard-press': { kind: 'target-hp-ratio' },

  return: { kind: 'happiness' },
  frustration: { kind: 'happiness' },

  'fury-cutter': { kind: 'consecutive-use' },
  'echoed-voice': { kind: 'consecutive-use' },
  'ice-ball': { kind: 'consecutive-use' },
  rollout: { kind: 'consecutive-use' },

  'dragon-rage': { kind: 'fixed-damage', amount: 40 },
  sonicboom: { kind: 'fixed-damage', amount: 20 },
  'sonic-boom': { kind: 'fixed-damage', amount: 20 },

  'night-shade': { kind: 'level-damage' },
  'seismic-toss': { kind: 'level-damage' },

  fissure: { kind: 'ohko' },
  guillotine: { kind: 'ohko' },
  'horn-drill': { kind: 'ohko' },
  'sheer-cold': { kind: 'ohko' },

  /** PokéAPI reports a placeholder power of 1, so it never falls through. */
  ruination: { kind: 'other' },
  'natures-madness': { kind: 'other' },

  bide: { kind: 'counter' },
  comeuppance: { kind: 'counter' },
  counter: { kind: 'counter' },
  'metal-burst': { kind: 'counter' },
  'mirror-coat': { kind: 'counter' },
}
