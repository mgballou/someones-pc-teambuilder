import { describe, expect, it } from 'vitest'
import type { PokemonSet, SetId, TeamId } from '@spc/core'
import { abilityId, itemId, moveId, newSet, speciesId } from '@spc/core'
import type { PokemonSetRow, TeamRow } from '../../src/db/schema'
import { toDomainSet, toDomainTeam, toRowValues } from '../../src/data/mappers'

const USER = '00000000-0000-4000-8000-000000000001'
const TEAM = '00000000-0000-4000-8000-000000000002'
const STORED = new Date('2026-09-01T00:00:00Z')

function set(id: string, species: string): PokemonSet {
  return newSet({ id: id as SetId, species: speciesId(species) })
}

const BARE = set('00000000-0000-4000-8000-00000000000a', 'pikachu')

const FULL: PokemonSet = {
  ...set('00000000-0000-4000-8000-00000000000b', 'landorus-therian'),
  nickname: 'Lando',
  level: 50,
  gender: 'male',
  shiny: true,
  ability: abilityId('intimidate'),
  item: itemId('choice-scarf'),
  nature: 'jolly',
  evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 },
  moves: [moveId('earthquake'), moveId('u-turn'), null, null],
  teraType: 'flying',
  notes: 'Scarf pivot.',
}

const GIGANTAMAX: PokemonSet = {
  ...set('00000000-0000-4000-8000-00000000000c', 'charizard'),
  gigantamax: true,
}

function rowOf(value: PokemonSet, teamId: string | null, position: number | null): PokemonSetRow {
  return {
    ...toRowValues({ userId: USER, teamId, position, set: value }),
    createdAt: STORED,
    updatedAt: STORED,
  }
}

function teamRowOf(formatId: string): TeamRow {
  return {
    id: TEAM,
    userId: USER,
    name: 'Rain',
    formatId,
    notes: '',
    tags: ['rain'],
    createdAt: STORED,
    updatedAt: STORED,
  }
}

describe('a set survives the trip to a row and back', () => {
  for (const value of [BARE, FULL, GIGANTAMAX]) {
    it(`round-trips ${value.species}`, () => {
      expect(toDomainSet(rowOf(value, TEAM, 0))).toEqual(value)
    })
  }
})

describe('toRowValues', () => {
  it('writes a Box set with no team and no slot', () => {
    const values = toRowValues({ userId: USER, teamId: null, position: null, set: BARE })
    expect([values.teamId, values.position]).toEqual([null, null])
  })

  it('keeps the form, not the base species', () => {
    expect(toRowValues({ userId: USER, teamId: TEAM, position: 0, set: FULL }).species).toBe(
      'landorus-therian',
    )
  })
})

describe('toDomainTeam', () => {
  const members = [rowOf(FULL, TEAM, 2), rowOf(BARE, TEAM, 0), rowOf(GIGANTAMAX, TEAM, 1)]

  it('orders members by slot, whatever order the rows arrive in', () => {
    const team = toDomainTeam({ team: teamRowOf('gen9-ou'), members })
    expect(team.members.map((member) => member.species)).toEqual([
      'pikachu',
      'charizard',
      'landorus-therian',
    ])
  })

  it('carries the team fields across', () => {
    const team = toDomainTeam({ team: teamRowOf('gen9-ou'), members: [] })
    expect(team).toEqual({
      id: TEAM as TeamId,
      name: 'Rain',
      format: 'gen9-ou',
      members: [],
      notes: '',
      tags: ['rain'],
    })
  })

  it('opens a team saved under a format id that has since been renamed', () => {
    const team = toDomainTeam({ team: teamRowOf('vgc-2026-reg-h'), members: [] })
    expect(team.format).toBe('vgc-reg-h')
  })
})
