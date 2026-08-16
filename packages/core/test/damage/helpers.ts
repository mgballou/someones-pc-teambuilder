import type { Dex, Item, Nature, PokemonSet, StatSpread, TeraType } from '../../src/index.js'
import { abilityId, EMPTY_EVS, itemId, newSet, setId, speciesId } from '../../src/index.js'
import { fixtureDex } from '../fixtures/dex.js'

export type SetOptions = {
  readonly species: string
  readonly level?: number
  readonly nature?: Nature
  readonly evs?: Partial<StatSpread>
  readonly item?: string | null
  readonly ability?: string | null
  readonly teraType?: TeraType | null
}

export function buildSet({
  species,
  level = 50,
  nature = 'hardy',
  evs = {},
  item = null,
  ability = null,
  teraType = null,
}: SetOptions): PokemonSet {
  return {
    ...newSet({ id: setId(species), species: speciesId(species), level, nature }),
    evs: { ...EMPTY_EVS, ...evs },
    item: item === null ? null : itemId(item),
    ability: ability === null ? null : abilityId(ability),
    teraType,
  }
}

/**
 * The fixture holds no item whose effect is `{ kind: 'unmodelled' }`, and the
 * honesty rules turn on that case. This delegates every lookup to the fixture
 * and answers for one extra id.
 */
export function dexWithItem(item: Item): Dex {
  return {
    ...fixtureDex,
    item: (id) => (id === item.id ? item : fixtureDex.item(id)),
    allItems: () => [...fixtureDex.allItems(), item],
  }
}

export function makeItem(id: string, effect: Item['effect']): Item {
  return {
    id: itemId(id),
    name: id
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    isBerry: false,
    flingPower: 0,
    restrictedTo: [],
    effect,
    description: '',
  }
}
