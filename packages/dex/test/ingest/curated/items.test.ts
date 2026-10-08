import { describe, expect, it } from 'vitest'
import type { Item, Species } from '@spc/core'
import { BUNDLED_DATASET } from '../../../src/bundled'
import {
  CURATED_ITEM_EFFECTS,
  FORM_BOUND_ITEMS,
  MEGA_STONES,
  RESIST_BERRY_ITEMS,
  SIGNATURE_ITEMS,
  TYPE_BOOST_ITEMS,
} from '../../../src/ingest/curated/items'

const items = new Map<string, Item>(BUNDLED_DATASET.items.map((i) => [i.id, i]))
const forms = new Map<string, Species>(BUNDLED_DATASET.species.map((s) => [s.id, s]))

const TABLES = [
  ['TYPE_BOOST_ITEMS', TYPE_BOOST_ITEMS, 'type-boost'],
  ['RESIST_BERRY_ITEMS', RESIST_BERRY_ITEMS, 'resist-berry'],
  ['MEGA_STONES', MEGA_STONES, 'mega-stone'],
  ['SIGNATURE_ITEMS', SIGNATURE_ITEMS, 'signature'],
] as const

describe.each(TABLES)('%s', (_, table, kind) => {
  it('names only items the dataset holds', () => {
    expect(Object.keys(table).filter((id) => !items.has(id))).toEqual([])
  })

  it(`gives every item it names the ${kind} effect`, () => {
    expect(Object.keys(table).filter((id) => items.get(id)?.effect.kind !== kind)).toEqual([])
  })
})

describe('TYPE_BOOST_ITEMS and RESIST_BERRY_ITEMS', () => {
  it.each([...Object.entries(TYPE_BOOST_ITEMS), ...Object.entries(RESIST_BERRY_ITEMS)])(
    'carries the type of %s into the dataset',
    (id, type) => {
      expect(items.get(id)?.effect).toMatchObject({ type })
    },
  )
})

describe('MEGA_STONES', () => {
  const stones = Object.entries(MEGA_STONES)

  it('names a holder the dataset holds for every stone', () => {
    expect(stones.filter(([, { holder }]) => !forms.has(holder)).map(([id]) => id)).toEqual([])
  })

  it('names a Mega form the dataset holds for every stone', () => {
    expect(stones.filter(([, { into }]) => !forms.has(into)).map(([id]) => id)).toEqual([])
  })

  it('lists every stone on its holder', () => {
    const wrong = stones.filter(
      ([id, { holder }]) => forms.get(holder)?.gimmicks.megaStones.includes(id) !== true,
    )
    expect(wrong.map(([id]) => id)).toEqual([])
  })

  it('restricts every stone to its holder', () => {
    const wrong = stones.filter(([id, { holder }]) => {
      const restrictedTo = items.get(id)?.restrictedTo ?? []
      return restrictedTo.length !== 1 || restrictedTo[0] !== holder
    })
    expect(wrong.map(([id]) => id)).toEqual([])
  })
})

describe('SIGNATURE_ITEMS and FORM_BOUND_ITEMS', () => {
  const bound = [
    ...Object.entries(SIGNATURE_ITEMS).map(([id, { holders }]) => [id, holders] as const),
    ...Object.entries(FORM_BOUND_ITEMS),
  ]

  it('names only forms the dataset holds', () => {
    const missing = bound.flatMap(([, holders]) => holders.filter((holder) => !forms.has(holder)))
    expect(missing).toEqual([])
  })

  it('names only items the dataset holds', () => {
    expect(Object.keys(FORM_BOUND_ITEMS).filter((id) => !items.has(id))).toEqual([])
  })

  it.each(bound)('restricts %s to the forms it names', (id, holders) => {
    expect(items.get(id)?.restrictedTo).toEqual(holders)
  })
})

describe('CURATED_ITEM_EFFECTS', () => {
  it('names only items the dataset holds', () => {
    expect(Object.keys(CURATED_ITEM_EFFECTS).filter((id) => !items.has(id))).toEqual([])
  })

  it.each(Object.entries(CURATED_ITEM_EFFECTS))('gives %s its curated effect', (id, effect) => {
    expect(items.get(id)?.effect).toMatchObject(effect)
  })
})
