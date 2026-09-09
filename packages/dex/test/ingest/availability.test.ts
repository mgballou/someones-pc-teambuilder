/**
 * Whether Scarlet and Violet hold a form.
 *
 * The dataset carries every form PokéAPI knows and hundreds of them are not in
 * the generation IX games at all. PokéAPI has no field that says so, so this is
 * read off the same version-grouped move list the learnset is — against a
 * narrower set of version groups, which is the whole difference and the thing
 * most worth pinning.
 */

import { describe, expect, it } from 'vitest'
import { FakePokeApiClient } from '../../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index'
import {
  availableGenerations,
  GENERATION_9,
  SCARLET_VIOLET_VERSION_GROUPS,
} from '../../src/ingest/availability'
import { GEN_9_VERSION_GROUPS } from '../../src/ingest/learnsets'

const client = FakePokeApiClient.of(SAMPLE_PAYLOADS)

describe('reading availability off a move list', () => {
  it('finds generation IX for a form the games hold', async () => {
    const pokemon = await client.pokemon('landorus-therian')
    expect(availableGenerations(pokemon)).toEqual([GENERATION_9])
  })

  it('finds nothing when no version group matches', async () => {
    const pokemon = await client.pokemon('landorus-therian')
    expect(availableGenerations(pokemon, new Set(['red-blue']))).toEqual([])
  })
})

describe('the version groups availability reads', () => {
  it('are the three Scarlet and Violet releases', () => {
    expect([...SCARLET_VIOLET_VERSION_GROUPS].sort()).toEqual([
      'scarlet-violet',
      'the-indigo-disk',
      'the-teal-mask',
    ])
  })

  /**
   * The learnset reads `champions` too, because PokéAPI files a handful of
   * moves legal in Scarlet and Violet only there. Reading it as presence is
   * what let three hundred forms into the dataset as usable, Pidgeot among
   * them, so the two sets are deliberately different and this is the check
   * that they stay different.
   */
  it('leave out the one the learnset adds', () => {
    expect(SCARLET_VIOLET_VERSION_GROUPS.has('champions')).toBe(false)
  })

  it('are all read by the learnset as well', () => {
    const missing = [...SCARLET_VIOLET_VERSION_GROUPS].filter(
      (group) => !GEN_9_VERSION_GROUPS.has(group),
    )
    expect(missing).toEqual([])
  })
})

describe('the four forms whose move list lies', () => {
  it('is absent when the curated list says it is, whatever the moves say', async () => {
    const pokemon = await client.pokemon('landorus-therian')
    expect(availableGenerations({ ...pokemon, name: 'greninja-ash' })).toEqual([])
  })

  it('is present when the curated list says it is, whatever the moves say', async () => {
    const pokemon = await client.pokemon('landorus-therian')
    const stripped = { ...pokemon, name: 'cramorant-gulping', moves: [] }
    expect(availableGenerations(stripped)).toEqual([GENERATION_9])
  })
})
