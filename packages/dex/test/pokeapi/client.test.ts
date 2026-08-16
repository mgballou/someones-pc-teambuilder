import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, describe, expect, it } from 'vitest'
import { LivePokeApiClient, mapWithConcurrency } from '../../src/pokeapi/client'

const ABILITY = {
  id: 22,
  name: 'intimidate',
  is_main_series: true,
  generation: { name: 'generation-iii' },
  effect_entries: [{ short_effect: 'Lowers Attack.', language: { name: 'en' } }],
}

let attempts = 0

const server = createServer((request, response) => {
  if (request.url?.includes('flaky') === true) {
    attempts += 1
    if (attempts < 3) {
      response.writeHead(429, { 'retry-after': '0' })
      response.end('slow down')
      return
    }
  }
  if (request.url?.includes('gone') === true) {
    response.writeHead(404)
    response.end('not found')
    return
  }
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify(ABILITY))
})

await new Promise<void>((resolve) => {
  server.listen(0, '127.0.0.1', resolve)
})
const port = (server.address() as AddressInfo).port
const baseUrl = `http://127.0.0.1:${port}/api/v2`

afterAll(() => {
  server.close()
})

const client = LivePokeApiClient.create({
  baseUrl,
  concurrency: 2,
  sleep: () => Promise.resolve(),
})

describe('LivePokeApiClient', () => {
  it('validates a response through the schema', async () => {
    expect((await client.ability('intimidate')).name).toBe('intimidate')
  })

  it('retries a 429 until it succeeds', async () => {
    expect((await client.ability('flaky')).id).toBe(22)
  })

  it('took three attempts to get there', () => {
    expect(attempts).toBe(3)
  })

  it('does not retry a 404', async () => {
    await expect(client.ability('gone')).rejects.toThrow('404')
  })
})

describe('mapWithConcurrency', () => {
  it('preserves input order', async () => {
    const doubled = await mapWithConcurrency([1, 2, 3, 4, 5], 2, (value) =>
      Promise.resolve(value * 2),
    )
    expect(doubled).toEqual([2, 4, 6, 8, 10])
  })

  it('never exceeds the cap', async () => {
    let live = 0
    let peak = 0
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      live += 1
      peak = Math.max(peak, live)
      await Promise.resolve()
      live -= 1
    })
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('handles an empty input', async () => {
    expect(await mapWithConcurrency([], 4, () => Promise.resolve(1))).toEqual([])
  })
})
