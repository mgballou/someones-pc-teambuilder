/**
 * The one line a failed connection prints before `db:push`.
 *
 * On a clone where Docker is not running, `drizzle-kit push` used to answer
 * with a stack trace ending in `ECONNREFUSED`, which names neither the port nor
 * the thing that should have been listening on it. This names both. It prints
 * the host and port only, never the URL, because the URL carries a password.
 */

export class DatabaseUnreachable extends Error {
  override readonly name = 'DatabaseUnreachable'

  private constructor(readonly address: string) {
    super(
      `Cannot reach Postgres at ${address}. Start Docker and run \`pnpm db:up\`, or point DATABASE_URL at a Postgres that is running.`,
    )
  }

  static at(url: string): DatabaseUnreachable {
    const { hostname, port } = new URL(url)
    return new DatabaseUnreachable(`${hostname}:${port === '' ? '5432' : port}`)
  }
}

/** Error codes that mean nothing answered, as opposed to a refused login. */
const UNREACHABLE_CODES = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ETIMEDOUT',
  'CONNECT_TIMEOUT',
] as const

export function isUnreachable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  return (UNREACHABLE_CODES as readonly unknown[]).includes(error.code)
}
