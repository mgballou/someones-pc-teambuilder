/**
 * One PokéAPI `item` becomes one `Item`.
 *
 * The rule that matters: **nothing is dropped.** An item whose effect this
 * codebase does not model still appears in the dataset with
 * `{ kind: 'unmodelled' }`, because the builder must let you equip a Metronome
 * and the calculator must be able to say "I did not account for this" rather
 * than treat it as an empty slot. Two thousand of the two hundred-odd items
 * here are Poké Balls, mail and evolution stones; they are all present.
 */

import type { Item, ItemEffect, SpeciesId } from '@spc/core'
import { itemId, speciesId } from '@spc/core'
import type { ItemResponse } from '../pokeapi/schema.js'
import { englishEffect } from '../pokeapi/schema.js'
import {
  CURATED_ITEM_EFFECTS,
  MEGA_STONES,
  RESIST_BERRY_ITEMS,
  SIGNATURE_ITEMS,
  TYPE_BOOST_ITEMS,
} from './curated/items.js'
import { oneSentence, titleWords } from './text.js'

/** Every 1.2x type item is the same multiplier; only the type differs. */
const TYPE_BOOST_MULTIPLIER = 1.2
const CHOICE_MULTIPLIER = 1.5

export function normalizeItem(response: ItemResponse): Item {
  const name = response.name
  return {
    id: itemId(name),
    name: titleWords(name),
    isBerry: name.endsWith('-berry'),
    flingPower: response.fling_power ?? 0,
    restrictedTo: restrictedTo(name),
    effect: effectOf(name),
    description: oneSentence(englishEffect(response.effect_entries)),
  }
}

function effectOf(name: string): ItemEffect {
  const mega = MEGA_STONES[name]
  if (mega !== undefined) return { kind: 'mega-stone', into: speciesId(mega.into) }

  const signature = SIGNATURE_ITEMS[name]
  if (signature !== undefined) return { kind: 'signature', note: signature.note }

  const boosted = TYPE_BOOST_ITEMS[name]
  if (boosted !== undefined) {
    return { kind: 'type-boost', type: boosted, multiplier: TYPE_BOOST_MULTIPLIER }
  }

  const resisted = RESIST_BERRY_ITEMS[name]
  if (resisted !== undefined) return { kind: 'resist-berry', type: resisted }

  const curated = CURATED_ITEM_EFFECTS[name]
  if (curated === undefined) return { kind: 'unmodelled' }

  switch (curated.kind) {
    case 'choice':
      return { kind: 'choice', stat: curated.stat, multiplier: CHOICE_MULTIPLIER }
    case 'category-boost':
      return { kind: 'category-boost', category: curated.category }
    case 'recovery':
      return { kind: 'recovery', fraction: curated.fraction }
    case 'life-orb':
    case 'expert-belt':
    case 'assault-vest':
    case 'eviolite':
    case 'booster-energy':
    case 'utility':
      return { kind: curated.kind }
    default: {
      const unreachable: never = curated
      return unreachable
    }
  }
}

function restrictedTo(name: string): readonly SpeciesId[] {
  const mega = MEGA_STONES[name]
  if (mega !== undefined) return [speciesId(mega.holder)]
  const signature = SIGNATURE_ITEMS[name]
  if (signature !== undefined) return signature.holders.map(speciesId)
  return []
}

/**
 * Mega stone names keyed by the form that may hold them, for
 * `Species.gimmicks.megaStones`. Built once from the same curated table the
 * item effects use, so the two can never disagree.
 */
export function megaStonesByHolder(): ReadonlyMap<string, readonly string[]> {
  const byHolder = new Map<string, string[]>()
  for (const [stone, { holder }] of Object.entries(MEGA_STONES)) {
    const existing = byHolder.get(holder)
    if (existing === undefined) byHolder.set(holder, [stone])
    else existing.push(stone)
  }
  return byHolder
}
