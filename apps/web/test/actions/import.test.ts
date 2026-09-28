import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { membersOf, noDatabase, seedTeam, signIn, testUsers } from '../harness/database'
import { NOTHING_READABLE, ONE_BAD_MOVE, TWO_SETS } from '../harness/pastes'
import { resetRequest, revalidatedPaths } from '../harness/request'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => import('../harness/request').then((m) => m.nextHeaders))
vi.mock('next/navigation', () => import('../harness/request').then((m) => m.nextNavigation))
vi.mock('next/cache', () => import('../harness/request').then((m) => m.nextCache))

const { importPasteAction } = await import('../../src/actions/import')

describe.skipIf(noDatabase)('importPasteAction', () => {
  const people = testUsers()

  beforeEach(() => resetRequest())
  afterAll(() => people.removeAll())

  async function myTeam(species: readonly string[] = [], formatId = 'gen9-ou') {
    const person = await people.create()
    await signIn(person.id)
    return seedTeam({ userId: person.id, species, formatId })
  }

  it('reports how many sets it imported and no problems', async () => {
    const team = await myTeam()
    expect(await importPasteAction(team.id, TWO_SETS)).toEqual({
      imported: 2,
      problems: [],
    })
  })

  it('writes each set after the members already there, in paste order', async () => {
    const team = await myTeam(['amoonguss'])
    await importPasteAction(team.id, TWO_SETS)
    const members = await membersOf(team.id)
    expect(members.map((row) => [row.species, row.position])).toEqual([
      ['amoonguss', 0],
      ['garchomp', 1],
      ['pikachu', 2],
    ])
  })

  it('writes what the paste says about each set', async () => {
    const team = await myTeam()
    await importPasteAction(team.id, TWO_SETS)
    const [garchomp] = await membersOf(team.id)

    expect(garchomp?.item).toBe('choice-scarf')
    expect(garchomp?.nature).toBe('jolly')
    expect(garchomp?.evs).toEqual({ hp: 0, atk: 252, def: 0, spa: 0, spd: 4, spe: 252 })
    expect(garchomp?.moves).toEqual(['earthquake', 'outrage', 'stone-edge', 'fire-fang'])
  })

  it("gives a set with no level line the team's format level", async () => {
    const team = await myTeam([], 'vgc-reg-h')
    await importPasteAction(team.id, TWO_SETS)
    expect((await membersOf(team.id)).map((row) => row.level)).toEqual([50, 50])
  })

  it('imports the readable part of a set with one bad move and names the move', async () => {
    const team = await myTeam()
    const result = await importPasteAction(team.id, ONE_BAD_MOVE)
    const [pikachu] = await membersOf(team.id)

    expect(result).toEqual({
      imported: 1,
      problems: ['No move "not-a-real-move" in the dataset'],
    })
    expect(pikachu?.moves).toEqual(['thunderbolt', null, null, null])
  })

  it('writes nothing for a paste with no species it can read', async () => {
    const team = await myTeam()
    const result = await importPasteAction(team.id, NOTHING_READABLE)
    expect(result.imported).toBe(0)
    expect(await membersOf(team.id)).toHaveLength(0)
  })

  it('revalidates the team', async () => {
    const team = await myTeam()
    await importPasteAction(team.id, TWO_SETS)
    expect(revalidatedPaths()).toEqual([`/teams/${team.id}`])
  })

  it("refuses a paste onto another user's team and writes nothing", async () => {
    const owner = await people.create()
    const team = await seedTeam({ userId: owner.id })
    await signIn((await people.create()).id)

    await expect(importPasteAction(team.id, TWO_SETS)).rejects.toThrow(
      `Not allowed to act on team ${team.id}.`,
    )
    expect(await membersOf(team.id)).toHaveLength(0)
  })

  it('refuses a team id that is not a uuid before it reaches the database', async () => {
    await signIn((await people.create()).id)
    await expect(importPasteAction('not-a-uuid', TWO_SETS)).rejects.toThrow(
      'Not allowed to act on team not-a-uuid.',
    )
  })

  it('refuses a signed-out call', async () => {
    const owner = await people.create()
    const team = await seedTeam({ userId: owner.id })
    await expect(importPasteAction(team.id, TWO_SETS)).rejects.toThrow('No active session.')
  })
})
