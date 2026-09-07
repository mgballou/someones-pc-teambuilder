import { abilityId } from '../ids'
import type { Move } from '../move'
import { BOOSTABLE_STATS } from '../stats'
import { MOD_DOUBLE, MOD_HALF, MOD_ONE_AND_A_HALF } from './modifier'
import type { Field, SideView, Status } from './types'

/**
 * Moves whose printed base power is not the power they deal.
 *
 * `variablePower` in the dataset answers "how is this move's power computed
 * from nothing" — Low Kick from a weight, Seismic Toss from a level. This
 * table answers the other question, and it is the one that was missing: a move
 * with a perfectly real printed power that the battle state then changes.
 *
 * That gap is why `variablePower: null` could not be trusted. It was set by
 * the ingest wherever PokéAPI printed a number, so it meant "PokéAPI printed a
 * number" and was read as "this power is a constant". Sixty-odd moves sat in
 * the difference and every one of them came back with an empty notes array,
 * looking exactly like a number that had been checked.
 *
 * So the rule this table exists to enforce: **an entry is a claim, and a claim
 * has to be answerable.** Every entry below either resolves its condition from
 * the state the calculator was handed — in which case there is nothing it
 * failed to account for and it says nothing — or it declares the condition
 * out of reach and says so on every single call. Turn order and battle history
 * are the whole of the second kind, because the core has no turn and no
 * history and rule 1 says it never will.
 *
 * A move's *type* under a field condition is next door in `moves.ts`, because
 * that is the same question the masks and Tera Blast ask. Weather Ball is in
 * both tables: its type is there and its power is here.
 */

export type PowerConditionInput = {
  readonly move: Move
  readonly attacker: SideView
  readonly defender: SideView
  readonly field: Field
  /** The type chart's answer for this move against this target, before abilities. */
  readonly effectiveness: number
  /** Which hit of a multi-hit move this is, counting from one. */
  readonly hit: number
}

/**
 * How the printed power changes.
 *
 * The distinction is not cosmetic. `power` replaces the printed number before
 * the base-power chain, so Technician sees the replacement; `modifier` is
 * pushed at the head of that chain, where the games put Knock Off's 1.5x. Knock
 * Off off a 65 base power is 97 in the games and 98 if you multiply first, and
 * that one point moves rolls.
 */
export type PowerEffect =
  | { readonly kind: 'power'; readonly of: (input: PowerConditionInput) => number }
  | { readonly kind: 'modifier'; readonly of: (input: PowerConditionInput) => number | null }

export type ConditionalPower = {
  readonly effect: PowerEffect
  /**
   * What the caller is owed. `null` is a claim that the state answered the
   * condition and the number is whole; anything else is said every time.
   */
  readonly note: (input: PowerConditionInput) => string | null
}

/** 4/3x, what Collision Course and Electro Drift gain on a super-effective hit. */
const MOD_FOUR_THIRDS = 5461

/** The state decided it. Nothing was left unaccounted for, so nothing is said. */
function resolved(): null {
  return null
}

/** Replace the printed power with a multiple of it when the condition holds. */
function scaledWhen(
  multiplier: number,
  holds: (input: PowerConditionInput) => boolean,
): PowerEffect {
  return {
    kind: 'power',
    of: (input) => (holds(input) ? input.move.basePower * multiplier : input.move.basePower),
  }
}

/** Push a base-power modifier when the condition holds. */
function modifierWhen(
  modifier: number,
  holds: (input: PowerConditionInput) => boolean,
): PowerEffect {
  return { kind: 'modifier', of: (input) => (holds(input) ? modifier : null) }
}

/** The printed power stands. For moves whose only rule is one nobody can check. */
const PRINTED: PowerEffect = { kind: 'power', of: ({ move }) => move.basePower }

/** Triple Axel and Triple Kick, whose hits climb by a fixed step. */
function escalatingHits(step: number): PowerEffect {
  return { kind: 'power', of: ({ hit }) => hit * step }
}

const PARADOX_ABILITIES = [abilityId('protosynthesis'), abilityId('quark-drive')]

/**
 * Whether there is an item on this Pokémon for Knock Off to take, and so also
 * whether Acrobatics counts it as empty-handed.
 *
 * A signature item is part of the form wearing it — Ogerpon's masks, the
 * Rusted Sword — and cannot be removed. Booster Energy is spent the instant a
 * Paradox ability takes it, so by the time anything is calculating there is
 * nothing left to knock off; `paradoxActive` in `abilities.ts` reads a held
 * Booster Energy the same way.
 */
function hasRemovableItem(view: SideView): boolean {
  const item = view.item
  if (item === null) return false
  if (item.restrictedTo.length > 0) return false
  if (item.effect.kind === 'signature' || item.effect.kind === 'mega-stone') return false
  if (item.effect.kind === 'booster-energy' && view.ability !== null) {
    return !PARADOX_ABILITIES.includes(view.ability)
  }
  return true
}

const FACADE_STATUSES: readonly Status[] = ['burn', 'poison', 'badly-poisoned', 'paralysis']

function isPoisoned(view: SideView): boolean {
  return view.status === 'poison' || view.status === 'badly-poisoned'
}

/** Positive stages only, which is what Stored Power counts. */
function positiveBoosts(view: SideView): number {
  return BOOSTABLE_STATS.reduce(
    (total, stat) => (view.boosts[stat] > 0 ? total + view.boosts[stat] : total),
    0,
  )
}

/** Solar Beam is halved by anything overhead that is not sun. */
function inDampeningWeather({ field }: PowerConditionInput): boolean {
  return field.weather === 'rain' || field.weather === 'sand' || field.weather === 'snow'
}

/**
 * A condition the calculator cannot answer, worded for the note.
 *
 * These read as a sentence: "<Move> doubles <when>. <what was assumed>."
 */
function unknowable(when: string, assumed: string) {
  return ({ move }: PowerConditionInput): string => `${move.name} ${when}. ${assumed}`
}

/**
 * Turn order.
 *
 * The core has no turn, so the two moves that read it are answered by
 * comparing unmodified Speed — the same guess the published calculators make,
 * and wrong for the same reasons: priority, Trick Room, Tailwind, paralysis
 * and a Choice Scarf all overturn it.
 */
function movesFirst({ attacker, defender }: PowerConditionInput): boolean {
  return attacker.stats.spe > defender.stats.spe
}

function turnOrderNote(when: string) {
  return (input: PowerConditionInput): string =>
    `${input.move.name} ${when}. Turn order was guessed by comparing Speed, which priority, Trick Room, Tailwind and paralysis all overturn.`
}

export const CONDITIONAL_POWER: Readonly<Record<string, ConditionalPower>> = {
  // --- What the two of them are holding ---
  'knock-off': {
    effect: modifierWhen(MOD_ONE_AND_A_HALF, ({ defender }) => hasRemovableItem(defender)),
    note: resolved,
  },
  acrobatics: {
    effect: scaledWhen(2, ({ attacker }) => !hasRemovableItem(attacker)),
    note: resolved,
  },

  // --- Status ---
  facade: {
    effect: modifierWhen(MOD_DOUBLE, ({ attacker }) => FACADE_STATUSES.includes(attacker.status)),
    note: resolved,
  },
  hex: {
    effect: scaledWhen(2, ({ defender }) => defender.status !== 'none'),
    note: resolved,
  },
  'infernal-parade': {
    effect: scaledWhen(2, ({ defender }) => defender.status !== 'none'),
    note: resolved,
  },
  venoshock: {
    effect: modifierWhen(MOD_DOUBLE, ({ defender }) => isPoisoned(defender)),
    note: resolved,
  },
  'barb-barrage': {
    effect: scaledWhen(2, ({ defender }) => isPoisoned(defender)),
    note: resolved,
  },
  'wake-up-slap': {
    effect: scaledWhen(2, ({ defender }) => defender.status === 'sleep'),
    note: resolved,
  },
  'smelling-salts': {
    effect: scaledWhen(2, ({ defender }) => defender.status === 'paralysis'),
    note: resolved,
  },

  // --- How much of the target is left ---
  brine: {
    effect: modifierWhen(MOD_DOUBLE, ({ defender }) => defender.hpFraction <= 0.5),
    note: resolved,
  },

  // --- Weather and terrain ---
  'weather-ball': {
    effect: scaledWhen(2, ({ field }) => field.weather !== 'none'),
    note: resolved,
  },
  'terrain-pulse': {
    effect: scaledWhen(2, ({ attacker, field }) => attacker.grounded && field.terrain !== 'none'),
    note: resolved,
  },
  'rising-voltage': {
    effect: scaledWhen(
      2,
      ({ defender, field }) => defender.grounded && field.terrain === 'electric',
    ),
    note: resolved,
  },
  psyblade: {
    effect: scaledWhen(1.5, ({ field }) => field.terrain === 'electric'),
    note: resolved,
  },
  'misty-explosion': {
    effect: modifierWhen(
      MOD_ONE_AND_A_HALF,
      ({ attacker, field }) => attacker.grounded && field.terrain === 'misty',
    ),
    note: resolved,
  },
  'expanding-force': {
    effect: modifierWhen(
      MOD_ONE_AND_A_HALF,
      ({ attacker, field }) => attacker.grounded && field.terrain === 'psychic',
    ),
    note: ({ move, attacker, field }) =>
      attacker.grounded && field.terrain === 'psychic'
        ? `${move.name} also hits both foes on Psychic Terrain. This is one target, so no spread reduction was applied.`
        : null,
  },
  'solar-beam': {
    effect: { kind: 'modifier', of: (input) => (inDampeningWeather(input) ? MOD_HALF : null) },
    note: resolved,
  },
  'solar-blade': {
    effect: { kind: 'modifier', of: (input) => (inDampeningWeather(input) ? MOD_HALF : null) },
    note: resolved,
  },
  'grav-apple': {
    effect: PRINTED,
    note: unknowable(
      'is 1.5x under Gravity',
      'The field does not model Gravity, so the printed power was used.',
    ),
  },

  // --- Stat stages ---
  'stored-power': {
    effect: { kind: 'power', of: ({ attacker }) => 20 + 20 * positiveBoosts(attacker) },
    note: resolved,
  },
  'power-trip': {
    effect: { kind: 'power', of: ({ attacker }) => 20 + 20 * positiveBoosts(attacker) },
    note: resolved,
  },

  // --- What the hit does to the target ---
  'collision-course': {
    effect: modifierWhen(MOD_FOUR_THIRDS, ({ effectiveness }) => effectiveness >= 2),
    note: resolved,
  },
  'electro-drift': {
    effect: modifierWhen(MOD_FOUR_THIRDS, ({ effectiveness }) => effectiveness >= 2),
    note: resolved,
  },

  // --- Hits that climb ---
  'triple-axel': {
    effect: escalatingHits(20),
    note: ({ move }) =>
      `${move.name}'s hits are 20, 40 and 60 base power. The rolls are their sum; the base power shown is the first hit's.`,
  },
  'triple-kick': {
    effect: escalatingHits(10),
    note: ({ move }) =>
      `${move.name}'s hits are 10, 20 and 30 base power. The rolls are their sum; the base power shown is the first hit's.`,
  },

  // --- Turn order, which the core does not have ---
  payback: {
    effect: scaledWhen(2, (input) => !movesFirst(input)),
    note: turnOrderNote('doubles when its user moves second'),
  },
  'bolt-beak': {
    effect: scaledWhen(2, movesFirst),
    note: turnOrderNote('doubles when its user moves first'),
  },
  'fishious-rend': {
    effect: scaledWhen(2, movesFirst),
    note: turnOrderNote('doubles when its user moves first'),
  },
  pursuit: {
    effect: PRINTED,
    note: unknowable(
      'doubles against a target that is switching out',
      'Nothing here knows that, so the printed power was used.',
    ),
  },

  // --- Battle history, which the core does not have either ---
  assurance: {
    effect: PRINTED,
    note: unknowable(
      'doubles if the target has already taken damage this turn',
      'The printed power was used.',
    ),
  },
  avalanche: {
    effect: PRINTED,
    note: unknowable('doubles if its user was hit this turn', 'The printed power was used.'),
  },
  revenge: {
    effect: PRINTED,
    note: unknowable('doubles if its user was hit this turn', 'The printed power was used.'),
  },
  retaliate: {
    effect: PRINTED,
    note: unknowable('doubles if an ally fainted last turn', 'The printed power was used.'),
  },
  round: {
    effect: PRINTED,
    note: unknowable('doubles if an ally used it first', 'The printed power was used.'),
  },
  'stomping-tantrum': {
    effect: PRINTED,
    note: unknowable("doubles if its user's last move failed", 'The printed power was used.'),
  },
  'lash-out': {
    effect: PRINTED,
    note: unknowable(
      "doubles if the user's stats were lowered this turn",
      'A stat stage does not say when it was set, so the printed power was used.',
    ),
  },
  'last-respects': {
    effect: PRINTED,
    note: unknowable(
      'gains 50 base power for every fainted ally',
      'The calculator holds one Pokémon a side, so the printed power was used.',
    ),
  },
  'rage-fist': {
    effect: PRINTED,
    note: unknowable(
      'gains 50 base power for every hit its user has taken',
      'The printed power was used.',
    ),
  },
}

export function conditionalPower(id: string): ConditionalPower | null {
  return CONDITIONAL_POWER[id] ?? null
}
