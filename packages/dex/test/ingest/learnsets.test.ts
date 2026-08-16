import { describe, expect, it } from 'vitest'
import { moveId } from '@spc/core'
import { FakePokeApiClient } from '../../src/pokeapi/client.js'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index.js'
import { learnsetOf } from '../../src/ingest/learnsets.js'
import { buildLearnsetTable } from '../../src/ingest/pipeline.js'

const client = FakePokeApiClient.of(SAMPLE_PAYLOADS)

const learnset = async (name: string) => learnsetOf(await client.pokemon(name))

describe('flattening version_group_details', () => {
  it('lists a move learnable in Scarlet and Violet once', async () => {
    const moves = await learnset('landorus-therian')
    expect(moves.filter((move) => move === moveId('earthquake'))).toHaveLength(1)
  })

  it('drops a move only learnable in an older generation', async () => {
    const moves = await learnset('landorus-therian')
    expect(moves).not.toContain(moveId('aerial-ace'))
  })

  it('returns the moves sorted', async () => {
    const moves = await learnset('landorus-therian')
    expect([...moves].sort()).toEqual([...moves])
  })

  it('honours an explicit version-group filter', async () => {
    const pokemon = await client.pokemon('landorus-therian')
    expect(learnsetOf(pokemon, new Set(['black-2-white-2']))).toContain(moveId('swords-dance'))
  })

  it('returns nothing when no version group matches', async () => {
    const pokemon = await client.pokemon('landorus-therian')
    expect(learnsetOf(pokemon, new Set(['red-blue']))).toEqual([])
  })
})

describe('buildLearnsetTable', () => {
  it('shares one offset between two species that learn the same move', () => {
    const table = buildLearnsetTable([
      ['a', [moveId('earthquake'), moveId('protect')]],
      ['b', [moveId('protect')]],
    ])
    expect(table.species['b']).toEqual([1])
  })

  it('lists each move name once', () => {
    const table = buildLearnsetTable([
      ['a', [moveId('earthquake'), moveId('protect')]],
      ['b', [moveId('protect')]],
    ])
    expect(table.moves).toEqual(['earthquake', 'protect'])
  })
})
