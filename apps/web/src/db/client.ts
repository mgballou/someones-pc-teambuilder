import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

/**
 * One connection pool per process.
 *
 * Next's dev server re-evaluates modules on every change, so the pool is
 * cached on `globalThis` — without that, a long editing session leaks a
 * connection per reload until Postgres refuses new ones.
 */

const globalForDb = globalThis as unknown as {
  spcSql: ReturnType<typeof postgres> | undefined
}

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (url === undefined || url === '') {
    throw MissingConfiguration.env('DATABASE_URL')
  }
  return url
}

const sql = globalForDb.spcSql ?? postgres(connectionString(), { max: 10 })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.spcSql = sql
}

export const db = drizzle(sql, { schema })

export class MissingConfiguration extends Error {
  override readonly name = 'MissingConfiguration'

  private constructor(readonly key: string) {
    super(`${key} is not set. Copy .env.example to .env.local and fill it in.`)
  }

  static env(key: string): MissingConfiguration {
    return new MissingConfiguration(key)
  }
}
