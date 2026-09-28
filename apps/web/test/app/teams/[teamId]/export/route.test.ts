import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { noDatabase, seedTeam, signIn, testUsers } from '../../../../harness/database'
import { TWO_SETS } from '../../../../harness/pastes'
import { Interrupted, resetRequest } from '../../../../harness/request'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => import('../../../../harness/request').then((m) => m.nextHeaders))
vi.mock('next/navigation', () =>
  import('../../../../harness/request').then((m) => m.nextNavigation),
)
vi.mock('next/cache', () => import('../../../../harness/request').then((m) => m.nextCache))

const { GET } = await import('../../../../../src/app/teams/[teamId]/export/route')
const { importPasteAction } = await import('../../../../../src/actions/import')

function exportOf(teamId: string): Promise<Response> {
  return GET(new Request(`http://localhost/teams/${teamId}/export`), {
    params: Promise.resolve({ teamId }),
  })
}

describe.skipIf(noDatabase)('GET /teams/[teamId]/export', () => {
  const people = testUsers()

  beforeEach(() => resetRequest())
  afterAll(() => people.removeAll())

  async function signedIn() {
    const person = await people.create()
    await signIn(person.id)
    return person
  }

  it('sends the team as a plain-text paste', async () => {
    const person = await signedIn()
    const team = await seedTeam({ userId: person.id, species: ['garchomp'] })
    const response = await exportOf(team.id)
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(await response.text()).toContain('Garchomp')
  })

  it('names the download after the team, with anything unsafe in a filename replaced', async () => {
    const person = await signedIn()
    const team = await seedTeam({ userId: person.id, name: 'Rain / Reg H "final"' })
    const response = await exportOf(team.id)
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="Rain-Reg-H-final-.txt"',
    )
  })

  it('exports an imported paste so that importing it again changes nothing', async () => {
    const person = await signedIn()
    const first = await seedTeam({ userId: person.id })
    await importPasteAction(first.id, 'gen9-ou', TWO_SETS)
    const once = await (await exportOf(first.id)).text()

    const second = await seedTeam({ userId: person.id })
    await importPasteAction(second.id, 'gen9-ou', once)
    const twice = await (await exportOf(second.id)).text()

    expect(twice).toBe(once)
  })

  it("answers 404 for another user's team", async () => {
    await signedIn()
    const team = await seedTeam({ userId: (await people.create()).id, species: ['garchomp'] })
    await expect(exportOf(team.id)).rejects.toEqual(Interrupted.notFound())
  })

  it('answers 404 when signed out', async () => {
    const owner = await people.create()
    const team = await seedTeam({ userId: owner.id, species: ['garchomp'] })
    await expect(exportOf(team.id)).rejects.toEqual(Interrupted.notFound())
  })
})
