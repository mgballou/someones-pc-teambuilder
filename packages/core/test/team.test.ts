import { describe, expect, test } from 'vitest'
import type { PokemonSet, SetId, Team } from '../src/index'
import {
  addMember,
  cloneSet,
  cloneTeam,
  copyMemberTo,
  duplicateMember,
  findMember,
  moveMemberBetween,
  newSet,
  newTeam,
  removeMember,
  reorderMember,
  replaceMember,
  setId,
  speciesId,
  teamId,
} from '../src/index'

function member(id: string, species: string): PokemonSet {
  return newSet({ id: setId(id), species: speciesId(species) })
}

function team(name: string, members: readonly PokemonSet[]): Team {
  return { ...newTeam({ id: teamId(name), name, format: 'gen9-ou' as never }), members }
}

const chomp = member('a', 'garchomp')
const rotom = member('b', 'rotom-wash')
const tusk = member('c', 'great-tusk')

describe('membership', () => {
  test('adds to the end', () => {
    expect(addMember(team('t', [chomp]), rotom).members.map((m) => m.id)).toEqual(['a', 'b'])
  })

  test('removes by id', () => {
    expect(removeMember(team('t', [chomp, rotom]), setId('a')).members.map((m) => m.id)).toEqual([
      'b',
    ])
  })

  test('removing an absent id changes nothing', () => {
    const before = team('t', [chomp, rotom])
    expect(removeMember(before, setId('zzz')).members).toHaveLength(2)
  })

  test('replaces in place, keeping position', () => {
    const edited = { ...rotom, nickname: 'Washer' }
    const after = replaceMember(team('t', [chomp, rotom, tusk]), edited)
    expect(after.members[1]?.nickname).toBe('Washer')
  })

  test('finds by id', () => {
    expect(findMember(team('t', [chomp, rotom]), setId('b'))?.species).toBe('rotom-wash')
  })
})

describe('reorderMember', () => {
  test('moves a member forward and closes the gap', () => {
    const after = reorderMember(team('t', [chomp, rotom, tusk]), setId('a'), 2)
    expect(after.members.map((m) => m.id)).toEqual(['b', 'c', 'a'])
  })

  test('moves a member backward', () => {
    const after = reorderMember(team('t', [chomp, rotom, tusk]), setId('c'), 0)
    expect(after.members.map((m) => m.id)).toEqual(['c', 'a', 'b'])
  })

  test('clamps an index past the end', () => {
    const after = reorderMember(team('t', [chomp, rotom]), setId('a'), 99)
    expect(after.members.map((m) => m.id)).toEqual(['b', 'a'])
  })

  test('an absent id leaves the team alone', () => {
    const before = team('t', [chomp, rotom])
    expect(reorderMember(before, setId('zzz'), 0)).toBe(before)
  })
})

describe('duplicateMember', () => {
  test('lands the copy directly after the original', () => {
    const after = duplicateMember(team('t', [chomp, rotom]), setId('a'), setId('a2'))
    expect(after.members.map((m) => m.id)).toEqual(['a', 'a2', 'b'])
  })

  test('the copy carries the original values', () => {
    const built = { ...chomp, nickname: 'Chompy' }
    const after = duplicateMember(team('t', [built]), setId('a'), setId('a2'))
    expect(after.members[1]?.nickname).toBe('Chompy')
  })

  test('the copy is a distinct object', () => {
    const after = duplicateMember(team('t', [chomp]), setId('a'), setId('a2'))
    expect(after.members[1]).not.toBe(after.members[0])
  })
})

describe('cloneTeam', () => {
  const source = team('Original', [chomp, rotom])
  const cloned = cloneTeam({
    team: source,
    id: teamId('copy'),
    name: 'Copy',
    memberIds: [setId('x'), setId('y')],
  })

  test('takes the new name', () => {
    expect(cloned.name).toBe('Copy')
  })

  test('re-keys every member', () => {
    expect(cloned.members.map((m) => m.id)).toEqual(['x', 'y'])
  })

  test('leaves the source untouched', () => {
    expect(source.members.map((m) => m.id)).toEqual(['a', 'b'])
  })

  /**
   * The guarantee spec §2 rests on: no id is shared between a team and its
   * clone, so editing one can never reach the other.
   */
  test('shares no member id with the source', () => {
    const sourceIds = new Set<string>(source.members.map((m) => m.id))
    const shared = cloned.members.filter((m) => sourceIds.has(m.id))
    expect(shared).toEqual([])
  })
})

describe('moving between teams', () => {
  test('the set leaves the source and joins the target', () => {
    const result = moveMemberBetween(team('from', [chomp, rotom]), team('to', [tusk]), setId('a'))
    expect(result?.from.members.map((m) => m.id)).toEqual(['b'])
  })

  test('the target gains it at the end', () => {
    const result = moveMemberBetween(team('from', [chomp, rotom]), team('to', [tusk]), setId('a'))
    expect(result?.to.members.map((m) => m.id)).toEqual(['c', 'a'])
  })

  test('a move of an absent set reports failure rather than losing it', () => {
    expect(moveMemberBetween(team('from', [chomp]), team('to', []), setId('zzz'))).toBeNull()
  })

  test('copying leaves the original in place', () => {
    const from = team('from', [chomp])
    copyMemberTo(from, team('to', []), setId('a'), setId('a2'))
    expect(from.members).toHaveLength(1)
  })

  test('the copy takes the new id', () => {
    const to = copyMemberTo(team('from', [chomp]), team('to', []), setId('a'), setId('a2'))
    expect(to?.members[0]?.id).toBe('a2')
  })
})

describe('cloneSet', () => {
  test('changes only the id', () => {
    const original = { ...chomp, nickname: 'Chompy', notes: 'lead' }
    expect(cloneSet(original, setId('new'))).toEqual({ ...original, id: 'new' as SetId })
  })
})
