/**
 * Typed errors for the one package that talks to the network and the disk.
 *
 * Every failure mode here is a class with a static factory, never a
 * hand-written string thrown at a call site. When an ingest of six thousand
 * requests dies at request 4,812, the thing that saves the afternoon is an
 * error that names the URL and the reason without being grepped for.
 */

export type PokeApiFailure =
  | { readonly kind: 'http'; readonly status: number }
  | { readonly kind: 'network' }
  | { readonly kind: 'invalid-response' }
  | { readonly kind: 'not-in-fixtures' }

export class PokeApiError extends Error {
  override readonly name = 'PokeApiError'

  private constructor(
    readonly failure: PokeApiFailure,
    readonly url: string,
    message: string,
    options?: { readonly cause: unknown },
  ) {
    super(message, options)
  }

  static http(url: string, status: number, attempts: number): PokeApiError {
    return new PokeApiError(
      { kind: 'http', status },
      url,
      `PokéAPI returned ${status} for ${url} after ${attempts} attempts`,
    )
  }

  static network(url: string, cause: unknown): PokeApiError {
    return new PokeApiError({ kind: 'network' }, url, `Could not reach ${url}`, { cause })
  }

  static invalidResponse(url: string, detail: string): PokeApiError {
    return new PokeApiError(
      { kind: 'invalid-response' },
      url,
      `PokéAPI response for ${url} did not match the schema: ${detail}`,
    )
  }

  static notInFixtures(url: string): PokeApiError {
    return new PokeApiError(
      { kind: 'not-in-fixtures' },
      url,
      `FakePokeApiClient has no sample payload for ${url}. Add one under src/pokeapi/fixtures/.`,
    )
  }
}

export type IngestFault =
  | { readonly kind: 'unknown-type'; readonly value: string }
  | { readonly kind: 'missing-stat'; readonly stat: string }
  | { readonly kind: 'no-types' }
  | { readonly kind: 'unknown-species' }

export class IngestError extends Error {
  override readonly name = 'IngestError'

  private constructor(
    readonly fault: IngestFault,
    readonly subject: string,
    message: string,
  ) {
    super(message)
  }

  static unknownType(subject: string, value: string): IngestError {
    return new IngestError(
      { kind: 'unknown-type', value },
      subject,
      `"${value}" on ${subject} is not one of the eighteen types`,
    )
  }

  static missingStat(subject: string, stat: string): IngestError {
    return new IngestError(
      { kind: 'missing-stat', stat },
      subject,
      `${subject} has no base ${stat} in the PokéAPI payload`,
    )
  }

  static noTypes(subject: string): IngestError {
    return new IngestError({ kind: 'no-types' }, subject, `${subject} has no usable typing`)
  }

  static unknownSpecies(subject: string): IngestError {
    return new IngestError(
      { kind: 'unknown-species' },
      subject,
      `${subject} refers to a pokemon-species that was never fetched`,
    )
  }
}

export type DatasetFault =
  | { readonly kind: 'unreadable'; readonly path: string }
  | { readonly kind: 'unparsable'; readonly path: string }

export class DatasetError extends Error {
  override readonly name = 'DatasetError'

  private constructor(
    readonly fault: DatasetFault,
    message: string,
    options?: { readonly cause: unknown },
  ) {
    super(message, options)
  }

  static unreadable(path: string, cause: unknown): DatasetError {
    return new DatasetError(
      { kind: 'unreadable', path },
      `Could not read ${path}. Run \`pnpm ingest\` to build the dataset.`,
      { cause },
    )
  }

  static unparsable(path: string, cause: unknown): DatasetError {
    return new DatasetError(
      { kind: 'unparsable', path },
      `${path} is not valid JSON. Run \`pnpm ingest\` to rebuild it.`,
      { cause },
    )
  }
}
