import { abilityId } from '../ids'
import type { AbilityId } from '../ids'
import type { PokemonType, TeraType } from '../pokemon-type'
import type { BoostableStat, StatSpread } from '../stats'
import { BOOSTABLE_STATS } from '../stats'
import { MOD_DOUBLE, MOD_HALF, MOD_ONE_AND_A_HALF, MOD_THREE_QUARTERS } from './modifier'
import type { StageChange, StageResponse } from './stage-change'
import type { Field, ModifierContext, SideView } from './types'

/** Returns a 4096-denominator modifier, or `null` for "this hook does nothing here". */
export type StatHook = (context: ModifierContext) => number | null

/** Rewrites the type multiplier. Wonder Guard is the only shape this exists for. */
export type EffectivenessHook = (current: number, context: ModifierContext) => number

export type NoteHook = (context: ModifierContext) => string | null

/**
 * How the holder answers a move of one type, beyond the chart.
 *
 * Absorbing the type outright is the common case and was for a long time the
 * only one the registry could say. Dry Skin is why that was not enough: it is
 * a Water immunity *and* a Fire weakness, and an entry that could only carry
 * the immunity read as complete while quietly dropping a quarter of the
 * damage. Anything shaped like Fluffy or Heatproof is a line of data here.
 */
export type TypeResponse =
  { readonly kind: 'immune' } | { readonly kind: 'base-power'; readonly modifier: number }

export type TypeResponses = Readonly<Partial<Record<PokemonType, TypeResponse>>>

const ABSORBS: TypeResponse = { kind: 'immune' }

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
  /** What the holder's ability does about an incoming move, read by its type. */
  readonly typeResponse?: TypeResponses
  /** A stage the ability imposes on the attacker, the way Intimidate does. */
  readonly foeAttackStage?: StageChange
  /**
   * How the holder rewrites a stage change aimed at it: Simple, Contrary,
   * Defiant, Competitive, Clear Body, Guard Dog, and the three that only stop
   * Intimidate. Read from the attacker's entry, because every stage the
   * calculator applies lands on the attacker.
   */
  readonly stageResponse?: StageResponse
  readonly adaptability?: boolean
  readonly ignoresBurn?: boolean
  /** Skill Link: a two-to-five-hit move lands all five, every time. */
  readonly everyHitLands?: boolean
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

/** 1.25x, what a Fire move gains against Dry Skin. */
const MOD_DRY_SKIN = 5120

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

/**
 * A Ruin ability lowers a stat on every Pokémon on the field *except the ones
 * carrying that same ability*, which is why each of the four has to know its
 * own id.
 *
 * Bulbapedia, Sword of Ruin: it "decreases the Defense stat of all Pokémon on
 * the field other than Pokémon with this Ability by 25%", and "the effect does
 * not stack if more than one Pokémon with Sword of Ruin is on the field". So
 * Chi-Yu facing Chi-Yu is a match-up in which neither Beads of Ruin does
 * anything at all, and the calculator that lowered both was reading the ability
 * as a field condition rather than as what it is.
 *
 * The state answers this, so nothing is said about it.
 */
function ruinFoeDefense(self: AbilityId, category: 'physical' | 'special'): AbilityEntry {
  return {
    foeDefenseStat: (context) =>
      context.category === category && context.defender.ability !== self
        ? MOD_THREE_QUARTERS
        : null,
  }
}

function ruinFoeAttack(self: AbilityId, category: 'physical' | 'special'): AbilityEntry {
  return {
    foeAttackStat: (context) =>
      context.category === category && context.attacker.ability !== self
        ? MOD_THREE_QUARTERS
        : null,
  }
}

function immunity(type: PokemonType): AbilityEntry {
  return { typeResponse: { [type]: ABSORBS } }
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
    basePower: (context) => (context.basePower <= 60 ? MOD_ONE_AND_A_HALF : null),
  },
  'sheer-force': {
    basePower: (context) => (hasModelledSecondary(context) ? MOD_PARADOX : null),
    note: (context) =>
      hasModelledSecondary(context)
        ? null
        : 'Sheer Force found no secondary effect on this move in the dataset, so no boost was applied.',
  },

  // Hit count
  'skill-link': { everyHitLands: true },

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
  'dry-skin': {
    typeResponse: { water: ABSORBS, fire: { kind: 'base-power', modifier: MOD_DRY_SKIN } },
  },
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

  // Stage rewrites. Each changes a stage before it lands on its holder, and
  // the calculator lands two of its own on the attacker — a defender's
  // Intimidate and a charging move's boost — so each of these moves the number.
  // The order they run in is in `stage-change.ts`.

  /**
   * Bulbapedia, Simple: it "directly doubles the number of stages that a stat
   * is increased or decreased". Intimidate lands as -2 Attack and Meteor Beam
   * as +2 Special Attack.
   */
  simple: { stageResponse: { kind: 'multiplies', factor: 2 } },
  /**
   * Bulbapedia, Contrary: "if an effect would lower a stat, it is increased
   * instead, and if an effect would increase a stat, it is decreased instead",
   * and "this also applies to self-inflicted changes". Intimidate lands as +1
   * Attack and Meteor Beam as -1 Special Attack.
   */
  contrary: { stageResponse: { kind: 'multiplies', factor: -1 } },
  /**
   * Bulbapedia, Defiant: "When a stat of a Pokémon with this Ability is lowered
   * by an opponent, its Attack is increased by two stages", and it "will not
   * activate if the Pokémon with this Ability lowers its own stats". Intimidate
   * lands as -1 and Defiant answers with +2, so +1 Attack in all.
   */
  defiant: { stageResponse: { kind: 'answers-foe-drops', stat: 'atk', stages: 2 } },
  /**
   * Bulbapedia, Competitive: "When a stat of a Pokémon with this Ability is
   * lowered by an opponent, its Special Attack is increased by two stages".
   * Intimidate still takes the Attack stage; the answer is on Special Attack.
   */
  competitive: { stageResponse: { kind: 'answers-foe-drops', stat: 'spa', stages: 2 } },
  /**
   * Bulbapedia, Clear Body: it "prevents stat reduction caused by other
   * Pokémon's moves and Abilities (such as Scary Face and Intimidate)" and
   * "does not prevent self-inflicted stat reductions".
   */
  'clear-body': { stageResponse: { kind: 'blocks-foe-drops' } },
  /**
   * Bulbapedia, Guard Dog: "if a Pokémon with this ability is affected by
   * Intimidate, its Attack stat will increase by one stage, rather than
   * decreasing by one stage." Its other effect, refusing a forced switch, does
   * not touch damage.
   */
  'guard-dog': { stageResponse: { kind: 'raises-on-intimidate', stages: 1 } },
  /**
   * Bulbapedia, Intimidate: from Generation VIII it "no longer affects Pokémon
   * with" Oblivious, Own Tempo, Inner Focus or Scrappy. Each of the first three
   * does nothing else to a damage roll. Scrappy also lets Normal and Fighting
   * moves hit Ghosts, which is outside the model, so it stays unmodelled.
   */
  'inner-focus': { stageResponse: { kind: 'blocks-intimidate' } },
  'own-tempo': { stageResponse: { kind: 'blocks-intimidate' } },
  oblivious: { stageResponse: { kind: 'blocks-intimidate' } },

  // The four Ruin abilities
  'sword-of-ruin': ruinFoeDefense(abilityId('sword-of-ruin'), 'physical'),
  'beads-of-ruin': ruinFoeDefense(abilityId('beads-of-ruin'), 'special'),
  'tablets-of-ruin': ruinFoeAttack(abilityId('tablets-of-ruin'), 'physical'),
  'vessel-of-ruin': ruinFoeAttack(abilityId('vessel-of-ruin'), 'special'),

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
  'unseen-fist': {},
  'natural-cure': {},
  'keen-eye': {},
  moxie: {},
  limber: {},
}

export function abilityEntry(id: string | null): AbilityEntry | null {
  if (id === null) return null
  return ABILITY_REGISTRY[id] ?? null
}

function responseTo(entry: AbilityEntry | null, moveType: TeraType): TypeResponse | null {
  if (entry?.typeResponse === undefined || moveType === 'stellar') return null
  return entry.typeResponse[moveType] ?? null
}

/** True when the holder's ability absorbs this type outright. */
export function absorbsType(entry: AbilityEntry | null, moveType: TeraType): boolean {
  return responseTo(entry, moveType)?.kind === 'immune'
}

/**
 * The defender's ability's contribution to the attacker's base power. Dry
 * Skin's Fire weakness is the only entry today; the games put it in the base
 * power chain rather than in type effectiveness, and the two round differently.
 */
export function foeBasePowerModifier(
  entry: AbilityEntry | null,
  moveType: TeraType,
): number | null {
  const response = responseTo(entry, moveType)
  return response?.kind === 'base-power' ? response.modifier : null
}
