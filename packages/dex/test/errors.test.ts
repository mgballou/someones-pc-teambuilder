import { describe, expect, it } from 'vitest'
import { DatasetError, IngestError, PokeApiError } from '../src/errors'

describe('PokeApiError', () => {
  it('describes an HTTP failure', () => {
    expect(PokeApiError.http('https://api.test/moves', 503, 3)).toMatchObject({
      name: 'PokeApiError',
      failure: { kind: 'http', status: 503 },
      url: 'https://api.test/moves',
      message: 'PokéAPI returned 503 for https://api.test/moves after 3 attempts',
    })
  })

  it('retains a network failure cause', () => {
    const cause = new Error('connection refused')

    expect(PokeApiError.network('https://api.test/moves', cause)).toMatchObject({
      name: 'PokeApiError',
      failure: { kind: 'network' },
      cause,
    })
  })

  it('describes an invalid response', () => {
    expect(PokeApiError.invalidResponse('https://api.test/moves', 'missing name')).toMatchObject({
      failure: { kind: 'invalid-response' },
      message: 'PokéAPI response for https://api.test/moves did not match the schema: missing name',
    })
  })

  it('points to the missing fake payload', () => {
    expect(PokeApiError.notInFixtures('https://api.test/moves')).toMatchObject({
      failure: { kind: 'not-in-fixtures' },
      message:
        'FakePokeApiClient has no sample payload for https://api.test/moves. Add one under src/pokeapi/fixtures/.',
    })
  })
})

describe('IngestError', () => {
  it.each([
    [
      IngestError.unknownType('Pikachu', '???'),
      'unknown-type',
      '"???" on Pikachu is not one of the eighteen types',
    ],
    [
      IngestError.missingStat('Pikachu', 'speed'),
      'missing-stat',
      'Pikachu has no base speed in the PokéAPI payload',
    ],
    [IngestError.noTypes('Pikachu'), 'no-types', 'Pikachu has no usable typing'],
    [
      IngestError.unknownSpecies('Pikachu'),
      'unknown-species',
      'Pikachu refers to a pokemon-species that was never fetched',
    ],
  ] as const)('describes the %s ingest failure', (error, kind, message) => {
    expect(error).toMatchObject({
      name: 'IngestError',
      fault: { kind },
      subject: 'Pikachu',
      message,
    })
  })
})

describe('DatasetError', () => {
  it('retains the unreadable file cause', () => {
    const cause = new Error('permission denied')

    expect(DatasetError.unreadable('/data/species.json', cause)).toMatchObject({
      name: 'DatasetError',
      fault: { kind: 'unreadable', path: '/data/species.json' },
      cause,
      message: 'Could not read /data/species.json. Run `pnpm ingest` to build the dataset.',
    })
  })

  it('retains the unparsable file cause', () => {
    const cause = new SyntaxError('unexpected token')

    expect(DatasetError.unparsable('/data/species.json', cause)).toMatchObject({
      name: 'DatasetError',
      fault: { kind: 'unparsable', path: '/data/species.json' },
      cause,
      message: '/data/species.json is not valid JSON. Run `pnpm ingest` to rebuild it.',
    })
  })
})
