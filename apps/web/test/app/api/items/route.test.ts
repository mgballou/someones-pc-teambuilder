import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { GET } = await import('../../../../src/app/api/items/route')

type Match = { readonly id: string; readonly name: string; readonly modelled: boolean }

async function search(query: string | null): Promise<readonly Match[]> {
  const url = new URL('http://localhost/api/items')
  if (query !== null) url.searchParams.set('q', query)
  const body: { matches: Match[] } = await (await GET(new Request(url))).json()
  return body.matches
}

describe('GET /api/items', () => {
  it('finds an item by part of its name', async () => {
    const ids = (await search('scarf')).map((match) => match.id)
    expect(ids).toContain('choice-scarf')
  })

  it('marks an item the calculator models', async () => {
    const [orb] = await search('life orb')
    expect(orb?.modelled).toBe(true)
  })

  it('returns at most forty rows for an empty query', async () => {
    expect(await search(null)).toHaveLength(40)
  })
})
