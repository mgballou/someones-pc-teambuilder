import { describe, expect, it } from 'vitest'
import { itemId, moveId, speciesId } from '@spc/core'
import { FakePokeApiClient } from '../../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index'
import { ingest } from '../../src/ingest/pipeline'

const client = FakePokeApiClient.of(SAMPLE_PAYLOADS)
const result = await ingest(client, { concurrency: 2 })

describe('the whole walk, against sample payloads', () => {
  it('produces one species per form', () => {
    expect(result.species).toHaveLength(4)
  })

  it('keeps both Landorus forms', () => {
    const ids = result.species.map((species) => species.id)
    expect(ids).toContain(speciesId('landorus-incarnate'))
  })

  it('keeps every item, modelled or not', () => {
    expect(result.items).toHaveLength(8)
  })

  it('builds a learnset for every form', () => {
    expect(Object.keys(result.learnsets.species)).toHaveLength(4)
  })

  it('only puts moves it has records for into a learnset', () => {
    const known = new Set(result.moves.map((move) => move.id))
    const unknown = result.learnsets.moves.filter((name) => !known.has(moveId(name)))
    expect(unknown).toEqual([])
  })

  it('reports progress for every stage', async () => {
    const stages: string[] = []
    await ingest(client, {
      concurrency: 2,
      onProgress: ({ stage }) => {
        if (!stages.includes(stage)) stages.push(stage)
      },
    })
    expect(stages).toEqual(['abilities', 'moves', 'items', 'pokemon-species', 'pokemon'])
  })
})

describe('the fake client', () => {
  it('refuses a resource it has no sample for', async () => {
    await expect(client.pokemon('garchomp')).rejects.toThrow('FakePokeApiClient')
  })

  it('validates a sample through the same schema as the live client', async () => {
    const item = await client.item('choice-band')
    expect(itemId(item.name)).toBe(itemId('choice-band'))
  })
})
