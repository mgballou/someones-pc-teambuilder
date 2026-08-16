import type { PokemonType } from '../pokemon-type'
import type { BoostableStat, StatSpread } from '../stats'
import { BOOSTABLE_STATS } from '../stats'
import { MOD_DOUBLE, MOD_HALF, MOD_ONE_AND_A_HALF, MOD_THREE_QUARTERS } from './modifier'
import type { Field, ModifierContext, SideView } from './types'

/** Returns a 4096-denominator modifier, or `null` for "this hook does nothing here". */
export type StatHook = (context: ModifierContext) => number | null

/** Rewrites the type multiplier. Wonder Guard is the only shape this exists for. */
export type EffectivenessHook = (current: number, context: ModifierContext) => number

export type NoteHook = (context: ModifierContext) => string | null

/**
 * One ability's damage-relevant behaviour, as data.
 *
 * Every hook is optional and every omitted hook means "no effect". An entry
 * that is entirely empty is a deliberate claim: the ability is modelled, and
 * it does not touch damage. That is what separates Regenerator from an ability
 * nobody has written down yet, which is reported as unmodelled instead.
 *
 * `foeAttackStat` and `foeDefenseStat` are read from the *other* side's entry:
 * the defender's Vessel of Ruin lowers the attacker's SpA, and the attacker's
 * Sword of Ruin lowers the defender's Def.
 */
export type AbilityEntry = {
  readonly attackStat?: StatHook
  readonly defenseStat?: StatHook
  readonly foeAttackStat?: StatHook
  readonly foeDefenseStat?: StatHook
  readonly basePower?: StatHook
  readonly finalAttacker?: StatHook
  readonly finalDefender?: StatHook
  readonly alterEffectiveness?: EffectivenessHook
  /** The holder takes nothing from this type at all. */
  readonly immuneTo?: PokemonType
  /** A stage the ability imposes on the attacker, the way Intimidate does. */
  readonly foeAttackStage?: { readonly stat: BoostableStat; readonly stages: number }
  readonly adaptability?: boolean
  readonly ignoresBurn?: boolean
  /** Unaware: the holder reads through the other side's stat stages. */
  readonly ignoresFoeBoosts?: boolean
  readonly moldBreaker?: boolean
  readonly note?: NoteHook
}

/** 1.3x, the Paradox and Life Orb constant. */
const MOD_PARADOX = 5325

/** 4/3x, what Hadron Engine and Orichalcum Pulse give. */
const MOD_FOUR_THIRDS = 5461

/** 2x on a resisted hit. */
const MOD_TINTED_LENS = MOD_DOUBLE

const ONE_THIRD = 1 / 3

function highestStat(stats: StatSpread): BoostableStat {
  return BOOSTABLE_STATS.reduce<BoostableStat>(
    (best, stat) => (stats[stat] > stats[best] ? stat : best),
    'atk',
  )
}

/** Paradox boosts are 1.3x, except on Speed where they are 1.5x. */
function paradoxModifier(stat: BoostableStat): number {
  return stat === 'spe' ? MOD_ONE_AND_A_HALF : MOD_PARADOX
}

function paradoxActive(view: SideView, field: Field, trigger: 'sun' | 'electric'): boolean {
  if (view.item?.effect.kind === 'booster-energy') return true
  return trigger === 'sun' ? field.weather === 'sun' : field.terrain === 'electric'
}

function paradoxAttack(trigger: 'sun' | 'electric'): StatHook {
  return (context) => {
    if (!paradoxActive(context.attacker, context.field, trigger)) return null
    const boosted = highestStat(context.attacker.stats)
    return boosted === context.attackStatName ? paradoxModifier(boosted) : null
  }
}

function paradoxDefense(trigger: 'sun' | 'electric'): StatHook {
  return (context) => {
    if (!paradoxActive(context.defender, context.field, trigger)) return null
    const boosted = highestStat(context.defender.stats)
    return boosted === context.defenseStatName ? paradoxModifier(boosted) : null
  }
}

/** Blaze, Torrent, Overgrow, Swarm: 1.5x their type below a third of maximum HP. */
function pinchBoost(type: PokemonType): AbilityEntry {
  return {
    attackStat: (context) =>
      context.moveType === type && context.attacker.hpFraction <= ONE_THIRD
        ? MOD_ONE_AND_A_HALF
        : null,
  }
}

function ruinFoeDefense(category: 'physical' | 'special'): AbilityEntry {
  return {
    foeDefenseStat: (context) => (context.category === category ? MOD_THREE_QUARTERS : null),
  }
}

function ruinFoeAttack(category: 'physical' | 'special'): AbilityEntry {
  return {
    foeAttackStat: (context) => (context.category === category ? MOD_THREE_QUARTERS : null),
  }
}

function immunity(type: PokemonType): AbilityEntry {
  return { immuneTo: type }
}

function hasModelledSecondary(context: ModifierContext): boolean {
  return context.move.statChanges.some((change) => change.chance > 0 && change.chance < 100)
}

/**
 * The curated ability registry.
 *
 * Keyed by the dataset's slug. An ability absent from this table is reported
 * in the result's notes rather than treated as nothing — see the honesty rules.
 */
export const ABILITY_REGISTRY: Readonly<Record<string, AbilityEntry>> = {
  // Offensive stat multipliers
  'huge-power': {
    attackStat: (context) => (context.category === 'physical' ? MOD_DOUBLE : null),
  },
  'pure-power': {
    attackStat: (context) => (context.category === 'physical' ? MOD_DOUBLE : null),
  },
  guts: {
    ignoresBurn: true,
    attackStat: (context) =>
      context.category === 'physical' && context.attacker.status !== 'none'
        ? MOD_ONE_AND_A_HALF
        : null,
  },
  hustle: {
    attackStat: (context) => (context.category === 'physical' ? MOD_ONE_AND_A_HALF : null),
  },
  'hadron-engine': {
    attackStat: (context) =>
      context.category === 'special' && context.field.terrain === 'electric'
        ? MOD_FOUR_THIRDS
        : null,
    note: (context) =>
      context.field.terrain === 'electric'
        ? null
        : 'Hadron Engine sets Electric Terrain on entry. The field says there is none, so no boost was applied.',
  },
  'orichalcum-pulse': {
    attackStat: (context) =>
      context.category === 'physical' && context.field.weather === 'sun' ? MOD_FOUR_THIRDS : null,
    note: (context) =>
      context.field.weather === 'sun'
        ? null
        : 'Orichalcum Pulse sets harsh sunlight on entry. The field says there is none, so no boost was applied.',
  },
  protosynthesis: {
    attackStat: paradoxAttack('sun'),
    defenseStat: paradoxDefense('sun'),
  },
  'quark-drive': {
    attackStat: paradoxAttack('electric'),
    defenseStat: paradoxDefense('electric'),
  },
  blaze: pinchBoost('fire'),
  torrent: pinchBoost('water'),
  overgrow: pinchBoost('grass'),
  swarm: pinchBoost('bug'),

  // Base power
  technician: {
    basePower: (context) => (context.basePower <= 60 ? MOD_DOUBLE : null),
  },
  'sheer-force': {
    basePower: (context) => (hasModelledSecondary(context) ? MOD_PARADOX : null),
    note: (context) =>
      hasModelledSecondary(context)
        ? null
        : 'Sheer Force found no secondary effect on this move in the dataset, so no boost was applied.',
  },

  // Type handling
  adaptability: { adaptability: true },
  'tinted-lens': {
    finalAttacker: (context) => (context.effectiveness < 1 ? MOD_TINTED_LENS : null),
  },
  'solid-rock': {
    finalDefender: (context) => (context.effectiveness > 1 ? MOD_THREE_QUARTERS : null),
  },
  filter: {
    finalDefender: (context) => (context.effectiveness > 1 ? MOD_THREE_QUARTERS : null),
  },
  'prism-armor': {
    finalDefender: (context) => (context.effectiveness > 1 ? MOD_THREE_QUARTERS : null),
  },
  'wonder-guard': {
    alterEffectiveness: (current) => (current > 1 ? current : 0),
  },
  'thick-fat': {
    foeAttackStat: (context) =>
      context.moveType === 'fire' || context.moveType === 'ice' ? MOD_HALF : null,
  },

  // Bulk
  multiscale: {
    finalDefender: (context) => (context.defender.hpFraction >= 1 ? MOD_HALF : null),
  },
  'shadow-shield': {
    finalDefender: (context) => (context.defender.hpFraction >= 1 ? MOD_HALF : null),
  },

  // Immunities
  levitate: immunity('ground'),
  'water-absorb': immunity('water'),
  'dry-skin': immunity('water'),
  'storm-drain': immunity('water'),
  'volt-absorb': immunity('electric'),
  'lightning-rod': immunity('electric'),
  'motor-drive': immunity('electric'),
  'flash-fire': immunity('fire'),
  'sap-sipper': immunity('grass'),
  'earth-eater': immunity('ground'),
  'well-baked-body': immunity('fire'),

  // Stage effects and stage blindness
  intimidate: { foeAttackStage: { stat: 'atk', stages: -1 } },
  unaware: { ignoresFoeBoosts: true },

  // The four Ruin abilities
  'sword-of-ruin': ruinFoeDefense('physical'),
  'beads-of-ruin': ruinFoeDefense('special'),
  'tablets-of-ruin': ruinFoeAttack('physical'),
  'vessel-of-ruin': ruinFoeAttack('special'),

  // Ability suppression
  'mold-breaker': { moldBreaker: true },
  turboblaze: { moldBreaker: true },
  teravolt: { moldBreaker: true },

  // Modelled and deliberately inert: these exist so they are not reported as
  // unmodelled. None of them changes a damage roll.
  'sand-veil': {},
  'snow-cloak': {},
  'rough-skin': {},
  'effect-spore': {},
  regenerator: {},
  pressure: {},
  frisk: {},
  'inner-focus': {},
  oblivious: {},
  'unseen-fist': {},
  'clear-body': {},
  'own-tempo': {},
}

export function abilityEntry(id: string | null): AbilityEntry | null {
  if (id === null) return null
  return ABILITY_REGISTRY[id] ?? null
}
