import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { GET } = await import('../../../../src/app/api/species/route')

type Match = { readonly id: string; readonly name: string; readonly types: readonly string[] }

async function search(query: string | null): Promise<readonly Match[]> {
  const url = new URL('http://localhost/api/species')
  if (query !== null) url.searchParams.set('q', query)
  const body: { matches: Match[] } = await (await GET(new Request(url))).json()
  return body.matches
}

describe('GET /api/species', () => {
  it('finds a species by part of its name, ignoring case and spaces', async () => {
    const matches = await search('  GARCH ')
    expect(matches.map((match) => match.id)).toContain('garchomp')
  })

  it('names a form after its species', async () => {
    const names = (await search('landorus')).map((match) => match.name)
    expect(names).toContain('Landorus-Therian')
  })

  it('carries the types a result row shows', async () => {
    const [garchomp] = await search('garchomp')
    expect(garchomp?.types).toEqual(['dragon', 'ground'])
  })

  it('returns at most forty rows for an empty query', async () => {
    expect(await search(null)).toHaveLength(40)
  })

  it('returns nothing for a name no species has', async () => {
    expect(await search('zzzz')).toEqual([])
  })
})
