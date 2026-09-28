import { describe, expect, it, vi } from 'vitest'
import type { DexPayload } from '../../../../src/lib/mini-dex'

vi.mock('server-only', () => ({}))

const { GET } = await import('../../../../src/app/api/calc/route')

async function payload(query: string): Promise<DexPayload> {
  return (await GET(new Request(`http://localhost/api/calc?${query}`))).json()
}

describe('GET /api/calc', () => {
  it('returns each species asked for', async () => {
    const body = await payload('species=garchomp&species=pelipper')
    expect(body.species.map((species) => species.id)).toEqual(['garchomp', 'pelipper'])
  })

  it("brings each species' abilities, hidden ability included", async () => {
    const body = await payload('species=garchomp')
    expect(body.abilities.map((ability) => ability.id).sort()).toEqual(['rough-skin', 'sand-veil'])
  })

  it('returns the moves and items asked for', async () => {
    const body = await payload('move=earthquake&item=choice-scarf')
    expect(body.moves.map((move) => move.id)).toEqual(['earthquake'])
    expect(body.items.map((item) => item.id)).toEqual(['choice-scarf'])
  })

  it('drops an id the dataset does not have rather than failing', async () => {
    const body = await payload('species=missingno&move=not-a-move&item=not-an-item')
    expect(body).toEqual({ species: [], moves: [], items: [], abilities: [], formats: [] })
  })

  it('lists an ability two species share once', async () => {
    const body = await payload('species=garchomp&species=gabite')
    const ids = body.abilities.map((ability) => ability.id)
    expect(ids).toEqual([...new Set(ids)])
  })
})
