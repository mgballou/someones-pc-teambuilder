import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  boxOf,
  membersOf,
  noDatabase,
  seedBoxSet,
  seedTeam,
  setRow,
  signIn,
  teamRow,
  teamsOf,
  testUsers,
} from '../harness/database'
import { redirectOf, resetRequest, revalidatedPaths } from '../harness/request'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => import('../harness/request').then((m) => m.nextHeaders))
vi.mock('next/navigation', () => import('../harness/request').then((m) => m.nextNavigation))
vi.mock('next/cache', () => import('../harness/request').then((m) => m.nextCache))

const actions = await import('../../src/actions/teams')

const SIGNED_OUT = { ok: false, message: 'No active session.' }
const OK = { ok: true }

function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

function refused(resource: 'team' | 'set', id: string) {
  return { ok: false, message: `Not allowed to act on ${resource} ${id}.` }
}

describe.skipIf(noDatabase)('team actions', () => {
  const people = testUsers()

  beforeEach(() => resetRequest())
  afterAll(() => people.removeAll())

  async function signedIn() {
    const person = await people.create()
    await signIn(person.id)
    return person
  }

  async function someoneElse() {
    return people.create()
  }

  describe('signed out', () => {
    it('refuses createTeamAction before writing anything', async () => {
      await expect(
        actions.createTeamAction(form({ name: 'Rain', formatId: 'gen9-ou' })),
      ).rejects.toThrow('No active session.')
    })

    it('refuses deleteTeamAction and leaves the team', async () => {
      const owner = await people.create()
      const team = await seedTeam({ userId: owner.id })
      await expect(actions.deleteTeamAction(team.id)).rejects.toThrow('No active session.')
      expect(await teamRow(team.id)).toBeDefined()
    })

    it('answers every result-returning action with the same refusal', async () => {
      const owner = await people.create()
      const team = await seedTeam({ userId: owner.id, species: ['garchomp'] })
      const setId = team.members[0] ?? ''
      const results = await Promise.all([
        actions.renameTeamAction(team.id, 'Taken'),
        actions.setTeamFormatAction(team.id, 'gen9-ou'),
        actions.addSpeciesAction(team.id, 'pikachu', 50),
        actions.duplicateSetAction(team.id, setId),
        actions.deleteSetAction(team.id, setId),
        actions.reorderAction(team.id, [setId]),
        actions.moveSetAction(setId, team.id),
        actions.copySetAction(setId, team.id),
        actions.deleteBoxSetAction(setId),
        actions.saveToBoxAction(setId),
        actions.pullFromBoxAction(setId, team.id),
      ])
      expect(results).toEqual(results.map(() => SIGNED_OUT))
    })

    it('changes no row when it refuses', async () => {
      const owner = await people.create()
      const team = await seedTeam({ userId: owner.id, species: ['garchomp'] })
      await actions.addSpeciesAction(team.id, 'pikachu', 50)
      await actions.deleteSetAction(team.id, team.members[0] ?? '')
      expect(await membersOf(team.id)).toHaveLength(1)
    })
  })

  describe('createTeamAction', () => {
    it('writes the team under the signed-in user and opens it', async () => {
      const person = await signedIn()
      const target = await redirectOf(() =>
        actions.createTeamAction(form({ name: '  Sun  ', formatId: 'vgc-reg-h' })),
      )
      const [created] = await teamsOf(person.id)

      expect(created?.name).toBe('Sun')
      expect(created?.formatId).toBe('vgc-reg-h')
      expect(target).toBe(`/teams/${created?.id}`)
    })

    it('refuses a format the dataset does not have', async () => {
      const person = await signedIn()
      await expect(
        actions.createTeamAction(form({ name: 'Sun', formatId: 'gen1-nonsense' })),
      ).rejects.toThrow('No format with that id.')
      expect(await teamsOf(person.id)).toHaveLength(0)
    })

    it('refuses a blank name', async () => {
      const person = await signedIn()
      await expect(
        actions.createTeamAction(form({ name: '   ', formatId: 'gen9-ou' })),
      ).rejects.toThrow('Name the team.')
      expect(await teamsOf(person.id)).toHaveLength(0)
    })
  })

  describe('renameTeamAction', () => {
    it('renames a team the user owns', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id })
      expect(await actions.renameTeamAction(team.id, 'Trick Room')).toEqual(OK)
      expect((await teamRow(team.id))?.name).toBe('Trick Room')
      expect(revalidatedPaths()).toEqual([`/teams/${team.id}`])
    })

    it("refuses another user's team and leaves its name", async () => {
      await signedIn()
      const other = await someoneElse()
      const team = await seedTeam({ userId: other.id, name: 'Theirs' })
      expect(await actions.renameTeamAction(team.id, 'Mine now')).toEqual(refused('team', team.id))
      expect((await teamRow(team.id))?.name).toBe('Theirs')
    })

    it('refuses an id that is not a uuid before it reaches the database', async () => {
      await signedIn()
      const result = await actions.renameTeamAction('not-a-uuid', 'Name')
      expect(result.ok).toBe(false)
    })
  })

  describe('setTeamFormatAction', () => {
    it("changes a team's format", async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id, formatId: 'gen9-ou' })
      await actions.setTeamFormatAction(team.id, 'vgc-reg-h')
      expect((await teamRow(team.id))?.formatId).toBe('vgc-reg-h')
    })

    it('refuses a format the dataset does not have and keeps the saved one', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id, formatId: 'gen9-ou' })
      const result = await actions.setTeamFormatAction(team.id, 'gen1-nonsense')
      expect(result.ok).toBe(false)
      expect((await teamRow(team.id))?.formatId).toBe('gen9-ou')
    })

    it("refuses another user's team", async () => {
      await signedIn()
      const team = await seedTeam({ userId: (await someoneElse()).id })
      expect(await actions.setTeamFormatAction(team.id, 'vgc-reg-h')).toEqual(
        refused('team', team.id),
      )
    })
  })

  describe('deleteTeamAction', () => {
    it('deletes the team and its members, then goes to the list', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id, species: ['garchomp', 'pikachu'] })
      const target = await redirectOf(() => actions.deleteTeamAction(team.id))

      expect(target).toBe('/teams')
      expect(await teamRow(team.id)).toBeUndefined()
      expect(await membersOf(team.id)).toHaveLength(0)
    })

    it("leaves another user's team where it is", async () => {
      await signedIn()
      const team = await seedTeam({ userId: (await someoneElse()).id })
      await redirectOf(() => actions.deleteTeamAction(team.id))
      expect(await teamRow(team.id)).toBeDefined()
    })
  })

  describe('cloneTeamAction', () => {
    it('copies every member under a fresh id, in order', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id, species: ['pelipper', 'barraskewda'] })
      const target = await redirectOf(() => actions.cloneTeamAction(team.id, 'Rain copy'))
      const copyId = target?.replace('/teams/', '') ?? ''
      const copied = await membersOf(copyId)

      expect(copied.map((row) => row.species)).toEqual(['pelipper', 'barraskewda'])
      expect(copied.map((row) => row.id)).not.toContain(team.members[0])
      expect((await teamRow(copyId))?.name).toBe('Rain copy')
    })

    it("refuses another user's team and writes nothing", async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: (await someoneElse()).id, species: ['garchomp'] })
      await expect(actions.cloneTeamAction(team.id, 'Stolen')).rejects.toThrow(
        `Not allowed to act on team ${team.id}.`,
      )
      expect(await teamsOf(person.id)).toHaveLength(0)
    })
  })

  describe('addSpeciesAction', () => {
    it('puts a fresh set in the next slot', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id, species: ['garchomp'] })
      await actions.addSpeciesAction(team.id, 'pikachu', 50)
      const members = await membersOf(team.id)

      expect(members.map((row) => [row.species, row.position])).toEqual([
        ['garchomp', 0],
        ['pikachu', 1],
      ])
    })

    it("refuses a set on another user's team", async () => {
      await signedIn()
      const team = await seedTeam({ userId: (await someoneElse()).id })
      expect(await actions.addSpeciesAction(team.id, 'pikachu', 50)).toEqual(
        refused('team', team.id),
      )
      expect(await membersOf(team.id)).toHaveLength(0)
    })

    it('refuses a level outside 1 to 100', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id })
      const result = await actions.addSpeciesAction(team.id, 'pikachu', 101)
      expect(result.ok).toBe(false)
      expect(await membersOf(team.id)).toHaveLength(0)
    })
  })

  describe('duplicateSetAction', () => {
    it('lands the copy directly after the original and shifts the rest down', async () => {
      const person = await signedIn()
      const team = await seedTeam({
        userId: person.id,
        species: ['pelipper', 'archaludon', 'amoonguss'],
      })
      await actions.duplicateSetAction(team.id, team.members[0] ?? '')
      const members = await membersOf(team.id)

      expect(members.map((row) => [row.species, row.position])).toEqual([
        ['pelipper', 0],
        ['pelipper', 1],
        ['archaludon', 2],
        ['amoonguss', 3],
      ])
    })

    it("refuses another user's set", async () => {
      await signedIn()
      const team = await seedTeam({ userId: (await someoneElse()).id, species: ['garchomp'] })
      const setId = team.members[0] ?? ''
      expect(await actions.duplicateSetAction(team.id, setId)).toEqual(refused('set', setId))
    })
  })

  describe('deleteSetAction', () => {
    it('deletes a set the user owns', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id, species: ['garchomp', 'pikachu'] })
      await actions.deleteSetAction(team.id, team.members[0] ?? '')
      expect((await membersOf(team.id)).map((row) => row.species)).toEqual(['pikachu'])
    })

    it("leaves another user's set in place", async () => {
      await signedIn()
      const team = await seedTeam({ userId: (await someoneElse()).id, species: ['garchomp'] })
      const setId = team.members[0] ?? ''
      await actions.deleteSetAction(team.id, setId)
      expect(await setRow(setId)).toBeDefined()
    })
  })

  describe('reorderAction', () => {
    it('writes the positions in the order given', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id, species: ['pelipper', 'archaludon'] })
      await actions.reorderAction(team.id, [...team.members].reverse())
      expect((await membersOf(team.id)).map((row) => row.species)).toEqual([
        'archaludon',
        'pelipper',
      ])
    })

    it("refuses another user's team and keeps its order", async () => {
      await signedIn()
      const team = await seedTeam({
        userId: (await someoneElse()).id,
        species: ['pelipper', 'archaludon'],
      })
      expect(await actions.reorderAction(team.id, [...team.members].reverse())).toEqual(
        refused('team', team.id),
      )
      expect((await membersOf(team.id)).map((row) => row.species)).toEqual([
        'pelipper',
        'archaludon',
      ])
    })
  })

  describe('moveSetAction', () => {
    it('takes the set off one team and puts it last on the other', async () => {
      const person = await signedIn()
      const from = await seedTeam({ userId: person.id, species: ['garchomp'] })
      const to = await seedTeam({ userId: person.id, species: ['pikachu'] })
      await actions.moveSetAction(from.members[0] ?? '', to.id)

      expect(await membersOf(from.id)).toHaveLength(0)
      expect((await membersOf(to.id)).map((row) => row.species)).toEqual(['pikachu', 'garchomp'])
    })

    it("refuses to move a set onto another user's team", async () => {
      const person = await signedIn()
      const mine = await seedTeam({ userId: person.id, species: ['garchomp'] })
      const theirs = await seedTeam({ userId: (await someoneElse()).id })
      expect(await actions.moveSetAction(mine.members[0] ?? '', theirs.id)).toEqual(
        refused('team', theirs.id),
      )
      expect(await membersOf(mine.id)).toHaveLength(1)
    })

    it("refuses to move another user's set onto the user's own team", async () => {
      const person = await signedIn()
      const mine = await seedTeam({ userId: person.id })
      const theirs = await seedTeam({ userId: (await someoneElse()).id, species: ['garchomp'] })
      const setId = theirs.members[0] ?? ''
      expect(await actions.moveSetAction(setId, mine.id)).toEqual(refused('set', setId))
      expect(await membersOf(theirs.id)).toHaveLength(1)
    })
  })

  describe('copySetAction', () => {
    it('leaves the original and adds a copy under a new id', async () => {
      const person = await signedIn()
      const from = await seedTeam({ userId: person.id, species: ['garchomp'] })
      const to = await seedTeam({ userId: person.id })
      await actions.copySetAction(from.members[0] ?? '', to.id)
      const [copy] = await membersOf(to.id)

      expect(await membersOf(from.id)).toHaveLength(1)
      expect(copy?.species).toBe('garchomp')
      expect(copy?.id).not.toBe(from.members[0])
    })

    it("refuses to copy another user's set", async () => {
      const person = await signedIn()
      const mine = await seedTeam({ userId: person.id })
      const theirs = await seedTeam({ userId: (await someoneElse()).id, species: ['garchomp'] })
      const setId = theirs.members[0] ?? ''
      expect(await actions.copySetAction(setId, mine.id)).toEqual(refused('set', setId))
      expect(await membersOf(mine.id)).toHaveLength(0)
    })
  })

  describe('the Box', () => {
    it('saveToBoxAction snapshots a team member into the Box', async () => {
      const person = await signedIn()
      const team = await seedTeam({ userId: person.id, species: ['garchomp'] })
      await actions.saveToBoxAction(team.members[0] ?? '')
      const box = await boxOf(person.id)

      expect(box.map((row) => row.species)).toEqual(['garchomp'])
      expect(box[0]?.id).not.toBe(team.members[0])
      expect(await membersOf(team.id)).toHaveLength(1)
    })

    it('pullFromBoxAction copies a Box set into the team and keeps it in the Box', async () => {
      const person = await signedIn()
      const boxed = await seedBoxSet(person.id, 'amoonguss')
      const team = await seedTeam({ userId: person.id })
      await actions.pullFromBoxAction(boxed, team.id)

      expect((await membersOf(team.id)).map((row) => row.species)).toEqual(['amoonguss'])
      expect(await setRow(boxed)).toBeDefined()
    })

    it("pullFromBoxAction refuses another user's Box set", async () => {
      const person = await signedIn()
      const boxed = await seedBoxSet((await someoneElse()).id, 'amoonguss')
      const team = await seedTeam({ userId: person.id })
      expect(await actions.pullFromBoxAction(boxed, team.id)).toEqual(refused('set', boxed))
    })

    it('deleteBoxSetAction removes a Box set', async () => {
      const person = await signedIn()
      const boxed = await seedBoxSet(person.id, 'amoonguss')
      await actions.deleteBoxSetAction(boxed)
      expect(await setRow(boxed)).toBeUndefined()
    })

    it("deleteBoxSetAction leaves another user's Box set", async () => {
      await signedIn()
      const boxed = await seedBoxSet((await someoneElse()).id, 'amoonguss')
      await actions.deleteBoxSetAction(boxed)
      expect(await setRow(boxed)).toBeDefined()
    })
  })
})
