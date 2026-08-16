import { describe, expect, it } from 'vitest'
import { itemId, speciesId } from '@spc/core'
import { FakePokeApiClient } from '../../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index'
import { megaStonesByHolder, normalizeItem } from '../../src/ingest/items'

const client = FakePokeApiClient.of(SAMPLE_PAYLOADS)

const item = async (name: string) => normalizeItem(await client.item(name))

describe('an unmodelled item is still in the dataset', () => {
  it('keeps the item', async () => {
    expect((await item('metronome')).id).toBe(itemId('metronome'))
  })

  it('tags the effect as unmodelled', async () => {
    expect((await item('metronome')).effect).toEqual({ kind: 'unmodelled' })
  })

  it('still gives it a name', async () => {
    expect((await item('metronome')).name).toBe('Metronome')
  })
})

describe('modelled effects', () => {
  it('maps Choice Band onto a 1.5x attack lock', async () => {
    expect((await item('choice-band')).effect).toEqual({
      kind: 'choice',
      stat: 'atk',
      multiplier: 1.5,
    })
  })

  it('maps Eviolite', async () => {
    expect((await item('eviolite')).effect).toEqual({ kind: 'eviolite' })
  })

  it('maps Leftovers onto a sixteenth', async () => {
    expect((await item('leftovers')).effect).toEqual({ kind: 'recovery', fraction: 1 / 16 })
  })

  it('maps a resist berry onto its type', async () => {
    expect((await item('occa-berry')).effect).toEqual({ kind: 'resist-berry', type: 'fire' })
  })

  it('maps a type-boost item onto 1.2x', async () => {
    expect((await item('charcoal')).effect).toEqual({
      kind: 'type-boost',
      type: 'fire',
      multiplier: 1.2,
    })
  })

  it('maps a mega stone onto the form it makes', async () => {
    expect((await item('charizardite-x')).effect).toEqual({
      kind: 'mega-stone',
      into: speciesId('charizard-mega-x'),
    })
  })

  it('locks a mega stone to its holder', async () => {
    expect((await item('charizardite-x')).restrictedTo).toEqual([speciesId('charizard')])
  })

  it('locks a signature item to its holder', async () => {
    expect((await item('wellspring-mask')).restrictedTo).toEqual([
      speciesId('ogerpon-wellspring-mask'),
    ])
  })
})

describe('berries', () => {
  it('recognises a berry by name', async () => {
    expect((await item('occa-berry')).isBerry).toBe(true)
  })

  it('does not call Leftovers a berry', async () => {
    expect((await item('leftovers')).isBerry).toBe(false)
  })
})

describe('megaStonesByHolder', () => {
  it('groups both Charizard stones under Charizard', async () => {
    expect(megaStonesByHolder().get('charizard')).toEqual(['charizardite-x', 'charizardite-y'])
  })
})
