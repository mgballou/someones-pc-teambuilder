import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { connectionString } from './config'
import * as schema from './schema'

/**
 * One connection pool per process.
 *
 * Next's dev server re-evaluates modules on every change, so the pool is
 * cached on `globalThis` — without that, a long editing session leaks a
 * connection per reload until Postgres refuses new ones.
 *
 * Where the URL comes from is `./config`, and it lives there because this
 * module's first statement runs it. A `class` declared below its own first use
 * is in the temporal dead zone, so the typed error that names the missing
 * setting used to throw a `ReferenceError` about itself instead.
 */

const globalForDb = globalThis as unknown as {
  spcSql: ReturnType<typeof postgres> | undefined
}

const sql = globalForDb.spcSql ?? postgres(connectionString(), { max: 10 })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.spcSql = sql
}

export const db = drizzle(sql, { schema })
