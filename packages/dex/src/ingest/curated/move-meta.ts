/**
 * Drain, recoil, multi-hit and crit ratio for the moves PokéAPI leaves blank.
 *
 * `/move/{name}.meta` is `null` for 110 moves — every generation IX move, a
 * handful from Legends: Arceus, and the Colosseum-era Shadow moves. Without
 * this table Wave Crash has no recoil, Population Bomb hits once, Bitter Blade
 * drains nothing and Flower Trick never crits, all of which are wrong in a way
 * the calculator cannot detect.
 *
 * Only moves whose blank `meta` would have said something are listed. A gen IX
 * move that drains nothing, hits once and crits normally needs no entry.
 */

export type CuratedMoveMeta = {
  /** Fraction of damage dealt recovered. */
  readonly drain?: number
  /** Fraction of damage dealt taken back. */
  readonly recoil?: number
  readonly multiHit?: { readonly min: number; readonly max: number }
  /** Stages above the base crit rate. 6 is "always crits". */
  readonly critRatio?: number
}

export const CURATED_MOVE_META: Readonly<Record<string, CuratedMoveMeta>> = {
  // Generation IX
  'aqua-cutter': { critRatio: 1 },
  'bitter-blade': { drain: 0.5 },
  'flower-trick': { critRatio: 6 },
  'ivy-cudgel': { critRatio: 1 },
  'matcha-gotcha': { drain: 0.5 },
  'population-bomb': { multiHit: { min: 1, max: 10 } },
  'tachyon-cutter': { multiHit: { min: 2, max: 2 } },
  'triple-dive': { multiHit: { min: 3, max: 3 } },
  'twin-beam': { multiHit: { min: 2, max: 2 } },

  // Legends: Arceus moves that carried into Scarlet and Violet
  'esper-wing': { critRatio: 1 },
  'triple-arrows': { critRatio: 1 },
  'wave-crash': { recoil: 0.33 },
}

/**
 * Damaging moves whose stat changes land on the *user*.
 *
 * Where PokéAPI has a `meta` block this is derivable: `damage-raise` means the
 * user's stats move and `damage-lower` means the target's, whatever the sign
 * of the change. Close Combat is `damage-raise` with two negative changes and
 * that is correct. For the moves with no `meta` there is nothing to read, so
 * the ones that hit their own stats are named here.
 */
export const SELF_STAT_CHANGE_MOVES: ReadonlySet<string> = new Set([
  'aqua-step',
  'armor-cannon',
  'electro-shot',
  'esper-wing',
  'headlong-rush',
  'make-it-rain',
  'mystical-power',
  'psyshield-bash',
  'spin-out',
  'tera-blast',
  'torch-song',
  'trailblaze',
  'triple-arrows',
])
