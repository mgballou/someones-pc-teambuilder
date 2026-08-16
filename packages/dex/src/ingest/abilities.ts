/**
 * One PokéAPI `ability` becomes one `Ability`.
 *
 * Thin, because core keeps abilities thin: the calculator holds its own
 * registry of the ones it models, and the dataset only has to name them,
 * describe them in a sentence, and say whether they can be switched off.
 */

import type { Ability } from '@spc/core'
import { abilityId } from '@spc/core'
import type { AbilityResponse } from '../pokeapi/schema'
import { englishEffect } from '../pokeapi/schema'
import { UNSUPPRESSABLE_ABILITIES } from './curated/abilities'
import { oneSentence, titleWords } from './text'

export function normalizeAbility(response: AbilityResponse): Ability {
  return {
    id: abilityId(response.name),
    name: titleWords(response.name),
    description: oneSentence(englishEffect(response.effect_entries)),
    suppressable: !UNSUPPRESSABLE_ABILITIES.has(response.name),
  }
}
