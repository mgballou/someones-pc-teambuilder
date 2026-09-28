import { describe, expect, it } from 'vitest'
import { DEFAULT_DATABASE_URL } from '../../src/db/config'
import { DatabaseUnreachable, isUnreachable } from '../../src/db/reach'

const message = DatabaseUnreachable.at(DEFAULT_DATABASE_URL).message

describe('DatabaseUnreachable', () => {
  it('names the host and port', () => {
    expect(message).toContain('localhost:5433')
  })

  it('names Docker', () => {
    expect(message).toContain('Docker')
  })

  it('names the command that starts the database', () => {
    expect(message).toContain('pnpm db:up')
  })

  it('fits on one line', () => {
    expect(message).not.toContain('\n')
  })

  it('never prints the password', () => {
    expect(DatabaseUnreachable.at('postgresql://spc:hunter2@db.test:6000/x').message).not.toContain(
      'hunter2',
    )
  })

  it('names the Postgres default port when the URL gives none', () => {
    expect(DatabaseUnreachable.at('postgresql://spc@db.test/x').address).toBe('db.test:5432')
  })
})

describe('isUnreachable', () => {
  it('holds for a refused connection', () => {
    expect(isUnreachable({ code: 'ECONNREFUSED' })).toBe(true)
  })

  it('holds for the driver timing out', () => {
    expect(isUnreachable({ code: 'CONNECT_TIMEOUT' })).toBe(true)
  })

  it('does not hold for a refused login', () => {
    expect(isUnreachable({ code: '28P01' })).toBe(false)
  })

  it('does not hold for something without a code', () => {
    expect(isUnreachable(new Error('boom'))).toBe(false)
  })
})
