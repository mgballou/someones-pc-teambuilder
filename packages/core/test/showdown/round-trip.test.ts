import { describe, expect, it } from 'vitest'
import { fixtureDex } from '../fixtures/dex.js'
import { parse, serialize, serializeTeam, setsOf } from '../../src/showdown/index.js'
import { NICKNAMED_SET, SIX_SET_TEAM, VARIED_SETS } from './fixtures.js'

describe('a set survives a round trip through a paste', () => {
  for (const set of VARIED_SETS) {
    it(`round-trips ${set.id}`, () => {
      const paste = serialize({ set, dex: fixtureDex })
      const result = parse({ paste, dex: fixtureDex, setId: () => set.id })
      expect(setsOf(result)).toEqual([set])
    })

    it(`reports nothing for ${set.id}`, () => {
      const paste = serialize({ set, dex: fixtureDex })
      expect(parse({ paste, dex: fixtureDex }).kind).toBe('ok')
    })
  }
})

describe('a team survives a round trip through a paste', () => {
  const paste = serializeTeam({ team: SIX_SET_TEAM, dex: fixtureDex })
  const result = parse({
    paste,
    dex: fixtureDex,
    setId: ({ index }) => SIX_SET_TEAM.members[index]?.id ?? NICKNAMED_SET.id,
  })

  it('separates the six sets with a blank line', () => {
    expect(paste.split('\n\n')).toHaveLength(6)
  })

  it('reads back every member', () => {
    expect(setsOf(result)).toEqual(SIX_SET_TEAM.members)
  })

  it('reports nothing', () => {
    expect(result.kind).toBe('ok')
  })
})

describe('the default level is honored on both sides', () => {
  const set = NICKNAMED_SET

  it('omits the level line when it matches the default', () => {
    expect(serialize({ set, dex: fixtureDex, defaultLevel: set.level })).not.toContain('Level:')
  })

  it('writes the level line when it does not', () => {
    expect(serialize({ set, dex: fixtureDex, defaultLevel: 100 })).toContain('Level: 50')
  })

  it('round-trips under a level-100 default', () => {
    const paste = serialize({ set, dex: fixtureDex, defaultLevel: 100 })
    const result = parse({ paste, dex: fixtureDex, defaultLevel: 100, setId: () => set.id })
    expect(setsOf(result)).toEqual([set])
  })
})
