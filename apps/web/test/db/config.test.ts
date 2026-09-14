import { afterEach, describe, expect, it } from 'vitest'
import { connectionString, DEFAULT_DATABASE_URL, MissingConfiguration } from '../../src/db/config'

const original = process.env.DATABASE_URL

afterEach(() => {
  if (original === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = original
})

describe('connectionString', () => {
  it('falls back to the Postgres docker-compose starts', () => {
    delete process.env.DATABASE_URL
    expect(connectionString()).toBe(DEFAULT_DATABASE_URL)
  })

  it('matches the URL docker-compose.yml publishes', () => {
    expect(DEFAULT_DATABASE_URL).toBe('postgresql://spc:spc@localhost:5433/someones_pc')
  })

  it('uses a set DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgresql://someone@example.test:5432/other'
    expect(connectionString()).toBe('postgresql://someone@example.test:5432/other')
  })

  it('refuses a blank DATABASE_URL rather than guessing', () => {
    process.env.DATABASE_URL = ''
    expect(() => connectionString()).toThrow()
  })

  it('throws MissingConfiguration for a blank one', () => {
    process.env.DATABASE_URL = ''
    expect(caught(connectionString)).toBeInstanceOf(MissingConfiguration)
  })

  it('names the setting in the message', () => {
    process.env.DATABASE_URL = '   '
    expect(() => connectionString()).toThrow(/DATABASE_URL/)
  })

  it('throws the typed error rather than a ReferenceError about it', () => {
    process.env.DATABASE_URL = ''
    expect((caught(connectionString) as Error).name).toBe('MissingConfiguration')
  })
})

function caught(run: () => unknown): unknown {
  try {
    run()
  } catch (error: unknown) {
    return error
  }
  return null
}
