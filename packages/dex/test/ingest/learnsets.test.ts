import { describe, expect, it } from 'vitest'
import { moveId } from '@spc/core'
import { FakePokeApiClient } from '../../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index'
import { GEN_9_VERSION_GROUPS, learnsetOf, withInheritedMoves } from '../../src/ingest/learnsets'
import type { FormLearnset } from '../../src/ingest/learnsets'
import { buildLearnsetTable } from '../../src/ingest/pipeline'

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

describe('the Generation 9 version groups', () => {
  it('reads the Scarlet and Violet family', () => {
    expect(GEN_9_VERSION_GROUPS.has('scarlet-violet')).toBe(true)
  })

  it('leaves out Champions, whose machine list Scarlet and Violet cut', () => {
    expect(GEN_9_VERSION_GROUPS.has('champions')).toBe(false)
  })
})

const form = (
  name: string,
  species: string,
  moves: readonly string[],
  isDefault = true,
): FormLearnset => ({
  form: name,
  species,
  isDefault,
  moves: moves.map(moveId),
})

const movesOf = (forms: readonly FormLearnset[], name: string): readonly string[] =>
  forms.find((entry) => entry.form === name)?.moves ?? []

describe('inheriting a pre-evolution learnset', () => {
  const chain = [
    form('pawniard', 'pawniard', ['sucker-punch', 'scratch']),
    form('bisharp', 'bisharp', ['iron-head']),
    form('kingambit', 'kingambit', ['kowtow-cleave']),
  ]
  const parents = new Map([
    ['bisharp', 'pawniard'],
    ['kingambit', 'bisharp'],
  ])

  it('gives an evolved form what its pre-evolution learns', () => {
    expect(movesOf(withInheritedMoves(chain, parents), 'bisharp')).toContain('sucker-punch')
  })

  it('walks the whole chain rather than one step of it', () => {
    expect(movesOf(withInheritedMoves(chain, parents), 'kingambit')).toContain('sucker-punch')
  })

  it('leaves the first stage alone', () => {
    expect(movesOf(withInheritedMoves(chain, parents), 'pawniard')).toEqual([
      'scratch',
      'sucker-punch',
    ])
  })

  it('returns the moves sorted', () => {
    const moves = movesOf(withInheritedMoves(chain, parents), 'kingambit')

    expect([...moves].sort()).toEqual([...moves])
  })

  it('lists an inherited move once when both stages learn it', () => {
    const shared = [
      form('pawniard', 'pawniard', ['iron-head']),
      form('bisharp', 'bisharp', ['iron-head']),
    ]

    expect(movesOf(withInheritedMoves(shared, parents), 'bisharp')).toEqual(['iron-head'])
  })

  it('takes the pre-evolution form that carries the same regional suffix', () => {
    const slow = [
      form('slowpoke', 'slowpoke', ['water-gun']),
      form('slowpoke-galar', 'slowpoke', ['acid'], false),
      form('slowbro-galar', 'slowbro', ['shell-side-arm'], false),
    ]

    expect(
      movesOf(withInheritedMoves(slow, new Map([['slowbro', 'slowpoke']])), 'slowbro-galar'),
    ).toContain('acid')
  })

  it('leaves a base form out of a regional pre-evolution', () => {
    const cats = [
      form('meowth', 'meowth', ['scratch']),
      form('meowth-alola', 'meowth', ['feint-attack'], false),
      form('persian', 'persian', ['power-gem']),
    ]

    expect(
      movesOf(withInheritedMoves(cats, new Map([['persian', 'meowth']])), 'persian'),
    ).not.toContain('feint-attack')
  })

  it('leaves a form with no pre-evolution alone', () => {
    expect(movesOf(withInheritedMoves(chain, new Map()), 'kingambit')).toEqual(['kowtow-cleave'])
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
