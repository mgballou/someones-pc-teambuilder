import { describe, expect, it } from 'vitest'
import { DEFAULT_DATABASE_URL } from '../../src/db/config'
import {
  databaseName,
  disposableUrl,
  E2E_DATABASE_URL,
  isDisposable,
  NotDisposable,
} from '../../e2e/database'

describe('the e2e database', () => {
  it('matches the URL the db-e2e service publishes', () => {
    expect(E2E_DATABASE_URL).toBe('postgresql://spc:spc@localhost:5434/someones_pc_e2e')
  })

  it('is disposable', () => {
    expect(isDisposable(E2E_DATABASE_URL)).toBe(true)
  })

  it('is not the database pnpm setup creates', () => {
    expect(databaseName(E2E_DATABASE_URL)).not.toBe(databaseName(DEFAULT_DATABASE_URL))
  })
})

describe('disposableUrl', () => {
  it('passes a database named for the suite through', () => {
    expect(disposableUrl('postgresql://u:p@ci.test:5432/other_e2e')).toBe(
      'postgresql://u:p@ci.test:5432/other_e2e',
    )
  })

  it('refuses the developer database', () => {
    expect(caught(() => disposableUrl(DEFAULT_DATABASE_URL))).toBeInstanceOf(NotDisposable)
  })

  it('refuses a URL that names no database', () => {
    expect(caught(() => disposableUrl('postgresql://u:p@localhost:5434'))).toBeInstanceOf(
      NotDisposable,
    )
  })

  it('refuses a name that only contains the suffix', () => {
    expect(
      caught(() => disposableUrl('postgresql://u:p@localhost:5434/someones_e2e_pc')),
    ).toBeInstanceOf(NotDisposable)
  })

  it('names the database it refused', () => {
    expect(() => disposableUrl(DEFAULT_DATABASE_URL)).toThrow(/"someones_pc"/)
  })

  it('says how to run the suite instead', () => {
    expect(() => disposableUrl(DEFAULT_DATABASE_URL)).toThrow(/pnpm test:e2e/)
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
