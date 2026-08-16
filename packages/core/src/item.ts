import type { AbilityId, ItemId, SpeciesId } from './ids'
import type { PokemonType } from './pokemon-type'

/**
 * Items, tagged by the role they play in a calculation.
 *
 * The `effect` union is what the calculator switches on. An item whose effect
 * we have not modelled gets `{ kind: 'unmodelled' }` rather than being left
 * out of the dataset — the builder must still let you equip it, and the calc
 * must be able to say "this item's effect is not in the model" rather than
 * quietly treating it as nothing.
 */
export type Item = {
  readonly id: ItemId
  readonly name: string
  readonly isBerry: boolean
  /** Base power when thrown with Fling. Zero when Fling cannot use it. */
  readonly flingPower: number
  /** The species this item locks to, for Mega Stones and signature items. */
  readonly restrictedTo: readonly SpeciesId[]
  readonly effect: ItemEffect
  readonly description: string
}

export type ItemEffect =
  /** Choice Band, Specs, Scarf: boosts one stat, locks into one move. */
  | { readonly kind: 'choice'; readonly stat: 'atk' | 'spa' | 'spe'; readonly multiplier: number }
  /** Charcoal, Mystic Water, and the rest of the 1.2x type plates. */
  | { readonly kind: 'type-boost'; readonly type: PokemonType; readonly multiplier: number }
  /** Life Orb: 1.3x damage, 10% recoil. */
  | { readonly kind: 'life-orb' }
  /** Expert Belt: 1.2x, but only on a super-effective hit. */
  | { readonly kind: 'expert-belt' }
  /** Muscle Band and Wise Glasses: 1.1x on one damage category. */
  | { readonly kind: 'category-boost'; readonly category: 'physical' | 'special' }
  /** Assault Vest: 1.5x SpD, no status moves. */
  | { readonly kind: 'assault-vest' }
  /** Eviolite: 1.5x Def and SpD, only if the holder can still evolve. */
  | { readonly kind: 'eviolite' }
  /** Rocky Helmet, Iron Ball and friends: modelled, but not in the damage path. */
  | { readonly kind: 'utility' }
  /** Berries that resist one type once. */
  | { readonly kind: 'resist-berry'; readonly type: PokemonType }
  /** Sitrus, Leftovers, and other recovery. Affects survival maths, not damage. */
  | { readonly kind: 'recovery'; readonly fraction: number }
  /** Booster Energy: 1.3x the holder's highest stat under Protosynthesis/Quark. */
  | { readonly kind: 'booster-energy' }
  /** Mega Stone: transforms the holder in formats where Mega is enabled. */
  | { readonly kind: 'mega-stone'; readonly into: SpeciesId }
  /** A signature item that changes a species' form or type, like the masks. */
  | { readonly kind: 'signature'; readonly note: string }
  /** In the dataset, equippable, but its effect is outside the model. */
  | { readonly kind: 'unmodelled' }

export type Ability = {
  readonly id: AbilityId
  readonly name: string
  readonly description: string
  /** True when the ability can be suppressed by Mold Breaker and its kin. */
  readonly suppressable: boolean
}
