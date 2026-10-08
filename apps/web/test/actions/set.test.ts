import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { noDatabase, seedBoxSet, seedTeam, setRow, signIn, testUsers } from '../harness/database'
import { resetRequest, revalidatedPaths } from '../harness/request'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => import('../harness/request').then((m) => m.nextHeaders))
vi.mock('next/navigation', () => import('../harness/request').then((m) => m.nextNavigation))
vi.mock('next/cache', () => import('../harness/request').then((m) => m.nextCache))

const { updateSetAction } = await import('../../src/actions/set')

const SPREAD = { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 }

describe.skipIf(noDatabase)('updateSetAction', () => {
  const people = testUsers()

  beforeEach(() => resetRequest())
  afterAll(() => people.removeAll())

  async function mySet() {
    const person = await people.create()
    await signIn(person.id)
    const team = await seedTeam({ userId: person.id, species: ['garchomp'] })
    return { person, team, setId: team.members[0] ?? '' }
  }

  it('writes a whole patch in one save', async () => {
    const { setId } = await mySet()
    await updateSetAction(setId, {
      nickname: '  Chomp  ',
      nature: 'jolly',
      item: 'choice-scarf',
      ability: 'rough-skin',
      teraType: 'steel',
      evs: SPREAD,
      moves: ['earthquake', 'outrage', null, ''],
    })
    const row = await setRow(setId)

    expect(row?.nickname).toBe('Chomp')
    expect(row?.nature).toBe('jolly')
    expect(row?.item).toBe('choice-scarf')
    expect(row?.ability).toBe('rough-skin')
    expect(row?.teraType).toBe('steel')
    expect(row?.evs).toEqual(SPREAD)
    expect(row?.moves).toEqual(['earthquake', 'outrage', null, null])
  })

  it('leaves the fields a patch does not name', async () => {
    const { setId } = await mySet()
    await updateSetAction(setId, { nature: 'jolly' })
    await updateSetAction(setId, { nickname: 'Chomp' })
    expect((await setRow(setId))?.nature).toBe('jolly')
  })

  it('revalidates the team the set is on and the Box', async () => {
    const { team, setId } = await mySet()
    await updateSetAction(setId, { shiny: true })
    expect(revalidatedPaths()).toEqual([`/teams/${team.id}`, '/box'])
  })

  it('saves a Box set, which has no team', async () => {
    const person = await people.create()
    await signIn(person.id)
    const boxed = await seedBoxSet(person.id, 'amoonguss')
    expect(await updateSetAction(boxed, { level: 50 })).toEqual({ ok: true })
  })

  it('clamps a single stat to 252 EVs', async () => {
    const { setId } = await mySet()
    await updateSetAction(setId, { evs: { ...SPREAD, atk: 300, spe: 0 } })
    expect((await setRow(setId))?.evs.atk).toBe(252)
  })

  it('refuses a spread over 508 EVs and keeps the saved one', async () => {
    const { setId } = await mySet()
    const result = await updateSetAction(setId, {
      evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 0, spe: 0 },
    })

    expect(result).toEqual({ ok: false, message: 'That spread uses 756 EVs. The cap is 508.' })
    expect((await setRow(setId))?.evs.hp).toBe(0)
  })

  it('keeps the saved nature when the patch names one that does not exist', async () => {
    const { setId } = await mySet()
    await updateSetAction(setId, { nature: 'jolly' })
    await updateSetAction(setId, { nature: 'grumpy' })
    expect((await setRow(setId))?.nature).toBe('jolly')
  })

  it('clears the Tera type when the patch names one that does not exist', async () => {
    const { setId } = await mySet()
    await updateSetAction(setId, { teraType: 'steel' })
    await updateSetAction(setId, { teraType: 'plastic' })
    expect((await setRow(setId))?.teraType).toBeNull()
  })

  it('refuses a level outside 1 to 100', async () => {
    const { setId } = await mySet()
    const result = await updateSetAction(setId, { level: 0 })
    expect(result.ok).toBe(false)
    expect((await setRow(setId))?.level).toBe(50)
  })

  it("refuses another user's set and leaves it unchanged", async () => {
    const owner = await people.create()
    const team = await seedTeam({ userId: owner.id, species: ['garchomp'] })
    const setId = team.members[0] ?? ''
    const intruder = await people.create()
    await signIn(intruder.id)

    expect(await updateSetAction(setId, { nickname: 'Mine' })).toEqual({
      ok: false,
      message: 'That set no longer exists.',
    })
    expect((await setRow(setId))?.nickname).toBeNull()
  })

  it('refuses a signed-out call', async () => {
    const owner = await people.create()
    const team = await seedTeam({ userId: owner.id, species: ['garchomp'] })
    expect(await updateSetAction(team.members[0] ?? '', { nickname: 'Mine' })).toEqual({
      ok: false,
      message: 'No active session.',
    })
  })
})
