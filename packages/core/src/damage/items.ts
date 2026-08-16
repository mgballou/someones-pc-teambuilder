import { abilityId } from '../ids'
import type { Item, ItemEffect } from '../item'
import { MOD_ONE_AND_A_HALF, modifierFromRatio } from './modifier'
import type { ModifierContext } from './types'

export type ItemRole = 'attacker' | 'defender'

const PROTOSYNTHESIS = abilityId('protosynthesis')
const QUARK_DRIVE = abilityId('quark-drive')

export type ItemHook = (effect: ItemEffect, context: ModifierContext) => number | null

export type ItemNoteHook = (item: Item, role: ItemRole, context: ModifierContext) => string | null

export type ItemHandler = {
  readonly attackStat?: ItemHook
  readonly defenseStat?: ItemHook
  readonly basePower?: ItemHook
  readonly finalAttacker?: ItemHook
  readonly finalDefender?: ItemHook
  readonly note?: ItemNoteHook
}

/** 1.3x. */
const MOD_LIFE_ORB = 5324
/** 1.2x. */
const MOD_EXPERT_BELT = 4915
/** 1.1x. */
const MOD_CATEGORY_BOOST = 4505

/**
 * The item registry, keyed by `ItemEffect['kind']` rather than by item id.
 *
 * The dataset already tags every item with the role it plays, so keying on the
 * tag means Charcoal and Mystic Water need one entry between them and a new
 * type plate needs no code at all. Writing the record over the union's keys
 * also means adding a member to `ItemEffect` fails typecheck here until it is
 * handled, which an id-keyed table could never do.
 */
export const ITEM_REGISTRY: Readonly<Record<ItemEffect['kind'], ItemHandler>> = {
  choice: {
    attackStat: (effect, context) => {
      if (effect.kind !== 'choice') return null
      return effect.stat === context.attackStatName ? modifierFromRatio(effect.multiplier) : null
    },
  },
  'type-boost': {
    basePower: (effect, context) => {
      if (effect.kind !== 'type-boost') return null
      return context.moveType === effect.type ? modifierFromRatio(effect.multiplier) : null
    },
  },
  'life-orb': {
    finalAttacker: (effect) => (effect.kind === 'life-orb' ? MOD_LIFE_ORB : null),
  },
  'expert-belt': {
    finalAttacker: (effect, context) => {
      if (effect.kind !== 'expert-belt') return null
      return context.effectiveness > 1 ? MOD_EXPERT_BELT : null
    },
  },
  'category-boost': {
    basePower: (effect, context) => {
      if (effect.kind !== 'category-boost') return null
      return context.category === effect.category ? MOD_CATEGORY_BOOST : null
    },
  },
  'assault-vest': {
    defenseStat: (effect, context) => {
      if (effect.kind !== 'assault-vest') return null
      return context.defenseStatName === 'spd' ? MOD_ONE_AND_A_HALF : null
    },
  },
  eviolite: {
    defenseStat: (effect, context) => {
      if (effect.kind !== 'eviolite') return null
      if (!context.defender.species.canEvolve) return null
      const stat = context.defenseStatName
      return stat === 'def' || stat === 'spd' ? MOD_ONE_AND_A_HALF : null
    },
  },
  'booster-energy': {
    note: (item, role, context) => {
      const holder = role === 'attacker' ? context.attacker : context.defender
      const ability = holder.ability
      if (ability === PROTOSYNTHESIS || ability === QUARK_DRIVE) return null
      return `${item.name} does nothing without Protosynthesis or Quark Drive, and none is modelled on ${holder.species.name}.`
    },
  },
  'resist-berry': {
    note: (item, role) =>
      role === 'defender'
        ? `${item.name} halves one super-effective hit. That is not modelled.`
        : null,
  },
  utility: {
    note: (item, role) =>
      role === 'defender' ? `${item.name} is not accounted for in the KO estimate.` : null,
  },
  recovery: {
    note: (item, role) =>
      role === 'defender' ? `${item.name} is not accounted for in the KO estimate.` : null,
  },
  'mega-stone': {
    note: (item) => `${item.name} changes the holder's form. That is not modelled here.`,
  },
  signature: {
    note: (item) => `${item.name} changes the holder's form or typing. That is not modelled here.`,
  },
  unmodelled: {
    note: (item) => `${item.name}'s effect is outside the damage model.`,
  },
}

export function itemHandler(item: Item | null): ItemHandler | null {
  return item === null ? null : ITEM_REGISTRY[item.effect.kind]
}
