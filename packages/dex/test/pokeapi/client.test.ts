import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { LivePokeApiClientOptions } from '../../src/pokeapi/client'
import { FakePokeApiClient, LivePokeApiClient, mapWithConcurrency } from '../../src/pokeapi/client'
import { SAMPLE_PAYLOADS } from '../../src/pokeapi/fixtures/index'

type Reply = {
  readonly status: number
  readonly body: string
  readonly headers?: Readonly<Record<string, string>>
}

const RECORDED: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  pokemon: SAMPLE_PAYLOADS.pokemon ?? {},
  'pokemon-species': SAMPLE_PAYLOADS.pokemonSpecies ?? {},
  move: SAMPLE_PAYLOADS.moves ?? {},
  item: SAMPLE_PAYLOADS.items ?? {},
  ability: SAMPLE_PAYLOADS.abilities ?? {},
}

const ok = (body: string): Reply => ({ status: 200, body })

function recorded(path: string): Reply {
  const [endpoint = '', name] = new URL(path, 'http://recorded').pathname.split('/').slice(3)
  const table = RECORDED[endpoint]
  if (table === undefined) return { status: 404, body: 'not found' }
  if (name === undefined) {
    const names = Object.keys(table)
    return ok(JSON.stringify({ count: names.length, results: names.map((n) => ({ name: n })) }))
  }
  const payload = table[name]
  return payload === undefined ? { status: 404, body: 'not found' } : ok(JSON.stringify(payload))
}

const requests: string[] = []
let reply: (path: string) => Reply = recorded

const server = createServer((request, response) => {
  const path = request.url ?? ''
  requests.push(path)
  const { status, body, headers = {} } = reply(path)
  response.writeHead(status, { 'content-type': 'application/json', ...headers })
  response.end(body)
})

await new Promise<void>((resolve) => {
  server.listen(0, '127.0.0.1', resolve)
})
const port = (server.address() as AddressInfo).port
const baseUrl = `http://127.0.0.1:${port}/api/v2`

afterAll(() => {
  server.close()
})

beforeEach(() => {
  requests.length = 0
  reply = recorded
})

function live(options: LivePokeApiClientOptions = {}): {
  readonly client: LivePokeApiClient
  readonly sleeps: readonly number[]
} {
  const sleeps: number[] = []
  const client = LivePokeApiClient.create({
    baseUrl,
    concurrency: 2,
    maxAttempts: 3,
    sleep: (ms) => {
      sleeps.push(ms)
      return Promise.resolve()
    },
    ...options,
  })
  return { client, sleeps }
}

function failingFirst(times: number, failure: Reply): (path: string) => Reply {
  let seen = 0
  return (path) => {
    seen += 1
    return seen <= times ? failure : recorded(path)
  }
}

async function closedPort(): Promise<number> {
  const probe = createServer()
  await new Promise<void>((resolve) => {
    probe.listen(0, '127.0.0.1', resolve)
  })
  const { port: free } = probe.address() as AddressInfo
  await new Promise<void>((resolve) => {
    probe.close(() => {
      resolve()
    })
  })
  return free
}

const fake = FakePokeApiClient.of(SAMPLE_PAYLOADS)

describe('LivePokeApiClient against recorded responses', () => {
  it.each([
    ['pokemon', 'landorus-therian'],
    ['pokemonSpecies', 'ogerpon'],
    ['move', 'wave-crash'],
    ['item', 'eviolite'],
    ['ability', 'intimidate'],
  ] as const)('parses %s/%s exactly as the fake client does', async (method, name) => {
    expect(await live().client[method](name)).toEqual(await fake[method](name))
  })

  it.each([
    ['pokemonIndex', 'pokemon'],
    ['speciesIndex', 'pokemon-species'],
    ['moveIndex', 'move'],
    ['itemIndex', 'item'],
    ['abilityIndex', 'ability'],
  ] as const)('reads %s from the %s resource list', async (method, endpoint) => {
    expect(await live().client[method]()).toEqual(Object.keys(RECORDED[endpoint] ?? {}))
  })

  it('asks for a whole index in one request', async () => {
    await live().client.moveIndex()
    expect(requests).toEqual(['/api/v2/move?limit=100000'])
  })
})

describe('retries', () => {
  const tooMany: Reply = { status: 429, body: 'slow down', headers: { 'retry-after': '0' } }

  it('retries a 429 until it succeeds', async () => {
    reply = failingFirst(2, tooMany)
    expect((await live().client.ability('intimidate')).id).toBe(22)
  })

  it('took three attempts to get there', async () => {
    reply = failingFirst(2, tooMany)
    await live().client.ability('intimidate')
    expect(requests).toHaveLength(3)
  })

  it('waits as long as retry-after asks', async () => {
    reply = failingFirst(1, { ...tooMany, headers: { 'retry-after': '2' } })
    const { client, sleeps } = live()
    await client.ability('intimidate')
    expect(sleeps).toEqual([2000])
  })

  it('doubles its wait on a 5xx with no retry-after', async () => {
    reply = failingFirst(2, { status: 503, body: 'unavailable' })
    const { client, sleeps } = live()
    await client.ability('intimidate')
    expect(sleeps).toEqual([500, 1000])
  })

  it('gives up with the last status once the attempts run out', async () => {
    reply = () => ({ status: 503, body: 'unavailable' })
    await expect(live().client.ability('intimidate')).rejects.toMatchObject({
      failure: { kind: 'http', status: 503 },
    })
  })

  it('stops at the attempt cap', async () => {
    reply = () => ({ status: 503, body: 'unavailable' })
    await live()
      .client.ability('intimidate')
      .catch(() => undefined)
    expect(requests).toHaveLength(3)
  })

  it('does not retry a 404', async () => {
    await expect(live().client.ability('gone')).rejects.toMatchObject({
      failure: { kind: 'http', status: 404 },
    })
  })

  it('asked for the 404 once', async () => {
    await live()
      .client.ability('gone')
      .catch(() => undefined)
    expect(requests).toHaveLength(1)
  })

  it('names a network failure once the attempts run out', async () => {
    const { client } = live({ baseUrl: `http://127.0.0.1:${await closedPort()}/api/v2` })
    await expect(client.ability('intimidate')).rejects.toMatchObject({
      failure: { kind: 'network' },
    })
  })
})

describe('responses that fail the boundary', () => {
  it('rejects a body that is not JSON', async () => {
    reply = () => ok('<html>maintenance</html>')
    await expect(live().client.ability('intimidate')).rejects.toMatchObject({
      failure: { kind: 'invalid-response' },
    })
  })

  it('rejects JSON that does not match the schema', async () => {
    reply = () => ok(JSON.stringify({ id: 'twenty-two', name: 'intimidate' }))
    await expect(live().client.ability('intimidate')).rejects.toMatchObject({
      failure: { kind: 'invalid-response' },
    })
  })
})

describe('the response cache', () => {
  const cacheDir = (): Promise<string> => mkdtemp(join(tmpdir(), 'spc-pokeapi-cache-'))

  it('writes each response gzipped, named after its path', async () => {
    const dir = await cacheDir()
    await live({ cacheDir: dir }).client.ability('intimidate')
    expect(await readdir(dir)).toEqual(['ability_intimidate.json.gz'])
  })

  it('stores the body it was sent', async () => {
    const dir = await cacheDir()
    await live({ cacheDir: dir }).client.ability('intimidate')
    const stored = gunzipSync(await readFile(join(dir, 'ability_intimidate.json.gz'))).toString()
    expect(stored).toBe(recorded('/api/v2/ability/intimidate').body)
  })

  it('serves a second client from the cache without a request', async () => {
    const dir = await cacheDir()
    await live({ cacheDir: dir }).client.ability('intimidate')
    requests.length = 0
    await live({ cacheDir: dir }).client.ability('intimidate')
    expect(requests).toEqual([])
  })

  it('fetches again when a cache file is corrupt', async () => {
    const dir = await cacheDir()
    await writeFile(join(dir, 'ability_intimidate.json.gz'), 'not gzip')
    expect((await live({ cacheDir: dir }).client.ability('intimidate')).name).toBe('intimidate')
  })

  it('fetches every time without a cache directory', async () => {
    const { client } = live()
    await client.ability('intimidate')
    await client.ability('intimidate')
    expect(requests).toHaveLength(2)
  })
})

describe('FakePokeApiClient', () => {
  it('lists the names it holds samples for', async () => {
    expect(await fake.abilityIndex()).toEqual(Object.keys(RECORDED['ability'] ?? {}))
  })

  it('says which sample is missing', async () => {
    await expect(fake.ability('levitate')).rejects.toMatchObject({
      failure: { kind: 'not-in-fixtures' },
    })
  })

  it('rejects a sample that has drifted from the schema', async () => {
    const drifted = FakePokeApiClient.of({ abilities: { intimidate: { id: 'twenty-two' } } })
    await expect(drifted.ability('intimidate')).rejects.toMatchObject({
      failure: { kind: 'invalid-response' },
    })
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
    let inFlight = 0
    let peak = 0
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await Promise.resolve()
      inFlight -= 1
    })
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('handles an empty input', async () => {
    expect(await mapWithConcurrency([], 4, () => Promise.resolve(1))).toEqual([])
  })
})
