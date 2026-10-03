import postgres from 'postgres'
// Loads apps/web/.env.local, and has to stay above './config' for the same
// reason the seed script keeps it above './client'.
import '../env'
import { connectionString } from './config'
import { DatabaseUnreachable, isUnreachable } from './reach'

/**
 * Runs ahead of `drizzle-kit push`: one query, a few tries, and the line from
 * `./reach` if nothing answers. A container that has only just reported
 * healthy can take a moment to accept connections on the published port, so
 * the first refusal is not the last word.
 */

const ATTEMPTS = 5
const PAUSE_MS = 1_000

async function reachable(url: string): Promise<boolean> {
  const sql = postgres(url, { max: 1, connect_timeout: 5, onnotice: () => {} })
  try {
    await sql`select 1`
    return true
  } catch (error: unknown) {
    if (isUnreachable(error)) return false
    throw error
  } finally {
    await sql.end({ timeout: 1 })
  }
}

async function main(): Promise<void> {
  const url = connectionString()
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    if (await reachable(url)) return
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS))
  }
  console.error(DatabaseUnreachable.at(url).message)
  process.exit(1)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
