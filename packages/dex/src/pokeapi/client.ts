/**
 * The only place in the workspace that opens a socket.
 *
 * Two implementations. `LivePokeApiClient` talks to pokeapi.co, politely: a
 * capped number of requests in flight, backoff on 429 and 5xx, and a gzipped
 * on-disk cache so the second run of an ingest costs nothing. `FakePokeApiClient`
 * serves committed sample payloads out of memory, which is what every test in
 * this package uses — the network is never a test dependency.
 */

import { gunzipSync, gzipSync } from 'node:zlib'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { PokeApiError } from '../errors'
import type {
  AbilityResponse,
  ItemResponse,
  MoveResponse,
  PokemonResponse,
  PokemonSpeciesResponse,
} from './schema'
import {
  abilitySchema,
  itemSchema,
  moveSchema,
  pokemonSchema,
  pokemonSpeciesSchema,
  resourceListSchema,
} from './schema'

export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2'

/**
 * What the ingest needs to know how to ask for. Endpoint-shaped rather than
 * URL-shaped, so a caller cannot construct a request the schemas do not cover.
 */
export type PokeApiClient = {
  readonly pokemonIndex: () => Promise<readonly string[]>
  readonly speciesIndex: () => Promise<readonly string[]>
  readonly moveIndex: () => Promise<readonly string[]>
  readonly itemIndex: () => Promise<readonly string[]>
  readonly abilityIndex: () => Promise<readonly string[]>

  readonly pokemon: (name: string) => Promise<PokemonResponse>
  readonly pokemonSpecies: (name: string) => Promise<PokemonSpeciesResponse>
  readonly move: (name: string) => Promise<MoveResponse>
  readonly item: (name: string) => Promise<ItemResponse>
  readonly ability: (name: string) => Promise<AbilityResponse>
}

type Parser<T> = { readonly safeParse: (value: unknown) => SafeParse<T> }

type SafeParse<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: { readonly message: string } }

export type LivePokeApiClientOptions = {
  readonly baseUrl?: string
  /** Directory for the gzipped response cache. Omit to run without one. */
  readonly cacheDir?: string | null
  /** Requests in flight at once. Eight is generous to a free API and quick. */
  readonly concurrency?: number
  readonly maxAttempts?: number
  /** Injected so tests never sleep and the retry path stays testable. */
  readonly sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export class LivePokeApiClient implements PokeApiClient {
  private readonly baseUrl: string
  private readonly cacheDir: string | null
  private readonly maxAttempts: number
  private readonly sleep: (ms: number) => Promise<void>
  private readonly gate: Semaphore

  private constructor(
    options: Required<Omit<LivePokeApiClientOptions, 'cacheDir'>> & {
      readonly cacheDir: string | null
    },
  ) {
    this.baseUrl = options.baseUrl
    this.cacheDir = options.cacheDir
    this.maxAttempts = options.maxAttempts
    this.sleep = options.sleep
    this.gate = new Semaphore(options.concurrency)
  }

  static create(options: LivePokeApiClientOptions = {}): LivePokeApiClient {
    return new LivePokeApiClient({
      baseUrl: options.baseUrl ?? POKEAPI_BASE_URL,
      cacheDir: options.cacheDir === undefined ? null : options.cacheDir,
      concurrency: options.concurrency ?? 8,
      maxAttempts: options.maxAttempts ?? 5,
      sleep: options.sleep ?? defaultSleep,
    })
  }

  pokemonIndex(): Promise<readonly string[]> {
    return this.index('pokemon')
  }

  speciesIndex(): Promise<readonly string[]> {
    return this.index('pokemon-species')
  }

  moveIndex(): Promise<readonly string[]> {
    return this.index('move')
  }

  itemIndex(): Promise<readonly string[]> {
    return this.index('item')
  }

  abilityIndex(): Promise<readonly string[]> {
    return this.index('ability')
  }

  pokemon(name: string): Promise<PokemonResponse> {
    return this.resource(`pokemon/${name}`, pokemonSchema)
  }

  pokemonSpecies(name: string): Promise<PokemonSpeciesResponse> {
    return this.resource(`pokemon-species/${name}`, pokemonSpeciesSchema)
  }

  move(name: string): Promise<MoveResponse> {
    return this.resource(`move/${name}`, moveSchema)
  }

  item(name: string): Promise<ItemResponse> {
    return this.resource(`item/${name}`, itemSchema)
  }

  ability(name: string): Promise<AbilityResponse> {
    return this.resource(`ability/${name}`, abilitySchema)
  }

  private async index(endpoint: string): Promise<readonly string[]> {
    const list = await this.resource(`${endpoint}?limit=100000`, resourceListSchema)
    return list.results.map((result) => result.name)
  }

  private async resource<T>(path: string, schema: Parser<T>): Promise<T> {
    const url = `${this.baseUrl}/${path}`
    const body = await this.gate.run(() => this.body(path, url))
    let value: unknown
    try {
      value = JSON.parse(body)
    } catch (cause) {
      throw PokeApiError.invalidResponse(url, `not JSON (${String(cause)})`)
    }
    const parsed = schema.safeParse(value)
    if (!parsed.success) throw PokeApiError.invalidResponse(url, parsed.error.message)
    return parsed.data
  }

  /** Cache hit, or a fetch that then fills the cache. */
  private async body(path: string, url: string): Promise<string> {
    const cached = await this.readCache(path)
    if (cached !== null) return cached
    const fetched = await this.fetchWithRetry(url)
    await this.writeCache(path, fetched)
    return fetched
  }

  private async fetchWithRetry(url: string): Promise<string> {
    let lastStatus = 0
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response: Response
      try {
        response = await fetch(url, { headers: { accept: 'application/json' } })
      } catch (cause) {
        if (attempt === this.maxAttempts) throw PokeApiError.network(url, cause)
        await this.sleep(backoffMs(attempt))
        continue
      }
      if (response.ok) return response.text()
      lastStatus = response.status
      if (!isRetryable(response.status)) throw PokeApiError.http(url, response.status, attempt)
      await this.sleep(retryAfterMs(response) ?? backoffMs(attempt))
    }
    throw PokeApiError.http(url, lastStatus, this.maxAttempts)
  }

  private async readCache(path: string): Promise<string | null> {
    if (this.cacheDir === null) return null
    try {
      return gunzipSync(await readFile(this.cachePath(path))).toString('utf8')
    } catch {
      return null
    }
  }

  private async writeCache(path: string, body: string): Promise<void> {
    if (this.cacheDir === null) return
    const file = this.cachePath(path)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, gzipSync(Buffer.from(body, 'utf8')))
  }

  /**
   * `.json.gz` rather than `.json` on purpose: prettier infers a parser from
   * the extension, and a cache of six thousand JSON files would otherwise
   * become six thousand lint failures.
   */
  private cachePath(path: string): string {
    if (this.cacheDir === null) throw PokeApiError.network(path, 'no cache directory')
    const safe = path.replace(/[^a-zA-Z0-9._-]+/g, '_')
    return join(this.cacheDir, `${safe}.json.gz`)
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

function backoffMs(attempt: number): number {
  return 500 * 2 ** (attempt - 1)
}

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after')
  if (header === null) return null
  const seconds = Number.parseInt(header, 10)
  return Number.isNaN(seconds) ? null : seconds * 1000
}

/** A fixed number of permits. Nothing clever; it only has to hold a cap. */
class Semaphore {
  private available: number
  private readonly waiting: (() => void)[] = []

  constructor(permits: number) {
    this.available = Math.max(1, permits)
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await task()
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    if (this.available > 0) {
      this.available -= 1
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.waiting.push(resolve)
    })
  }

  private release(): void {
    const next = this.waiting.shift()
    if (next === undefined) {
      this.available += 1
      return
    }
    next()
  }
}

export type FakePayloads = {
  readonly pokemon?: Readonly<Record<string, unknown>>
  readonly pokemonSpecies?: Readonly<Record<string, unknown>>
  readonly moves?: Readonly<Record<string, unknown>>
  readonly items?: Readonly<Record<string, unknown>>
  readonly abilities?: Readonly<Record<string, unknown>>
}

/**
 * The client every test uses.
 *
 * It runs the same zod schemas as the live client, so a sample payload that
 * has drifted from the real shape fails the test suite rather than the ingest.
 */
export class FakePokeApiClient implements PokeApiClient {
  private constructor(private readonly payloads: FakePayloads) {}

  static of(payloads: FakePayloads): FakePokeApiClient {
    return new FakePokeApiClient(payloads)
  }

  pokemonIndex(): Promise<readonly string[]> {
    return Promise.resolve(Object.keys(this.payloads.pokemon ?? {}))
  }

  speciesIndex(): Promise<readonly string[]> {
    return Promise.resolve(Object.keys(this.payloads.pokemonSpecies ?? {}))
  }

  moveIndex(): Promise<readonly string[]> {
    return Promise.resolve(Object.keys(this.payloads.moves ?? {}))
  }

  itemIndex(): Promise<readonly string[]> {
    return Promise.resolve(Object.keys(this.payloads.items ?? {}))
  }

  abilityIndex(): Promise<readonly string[]> {
    return Promise.resolve(Object.keys(this.payloads.abilities ?? {}))
  }

  pokemon(name: string): Promise<PokemonResponse> {
    return this.lookup('pokemon', this.payloads.pokemon, name, pokemonSchema)
  }

  pokemonSpecies(name: string): Promise<PokemonSpeciesResponse> {
    return this.lookup('pokemon-species', this.payloads.pokemonSpecies, name, pokemonSpeciesSchema)
  }

  move(name: string): Promise<MoveResponse> {
    return this.lookup('move', this.payloads.moves, name, moveSchema)
  }

  item(name: string): Promise<ItemResponse> {
    return this.lookup('item', this.payloads.items, name, itemSchema)
  }

  ability(name: string): Promise<AbilityResponse> {
    return this.lookup('ability', this.payloads.abilities, name, abilitySchema)
  }

  private lookup<T>(
    endpoint: string,
    table: Readonly<Record<string, unknown>> | undefined,
    name: string,
    schema: Parser<T>,
  ): Promise<T> {
    const url = `${POKEAPI_BASE_URL}/${endpoint}/${name}`
    const payload = table?.[name]
    if (payload === undefined) return Promise.reject(PokeApiError.notInFixtures(url))
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      return Promise.reject(PokeApiError.invalidResponse(url, parsed.error.message))
    }
    return Promise.resolve(parsed.data)
  }
}

/**
 * Run `task` over `values` with at most `limit` outstanding at a time,
 * preserving input order in the result. The ingest walks five endpoints this
 * way; the client's own semaphore caps the sockets underneath.
 */
export async function mapWithConcurrency<A, B>(
  values: readonly A[],
  limit: number,
  task: (value: A, index: number) => Promise<B>,
): Promise<B[]> {
  const results = new Array<B>(values.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(Math.max(1, limit), values.length) }, async () => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= values.length) return
      const value = values[index]
      if (value === undefined) return
      results[index] = await task(value, index)
    }
  })
  await Promise.all(workers)
  return results
}
