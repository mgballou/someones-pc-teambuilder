/**
 * Where the database is, and the one place that decides.
 *
 * `docker-compose.yml`, `.env.example` and CI all name the same Postgres, and
 * for a while `drizzle.config.ts` held a fourth copy of the URL while
 * `client.ts` held none. That is how `pnpm db:push` came to work on a clean
 * clone and `pnpm db:seed`, the next line of `pnpm setup`, did not.
 *
 * Nothing here reads a file or opens a connection, so `drizzle.config.ts`, the
 * seed script and the Next server can all import it.
 */

/** The Postgres `docker-compose.yml` starts. `pnpm setup` needs no edits. */
export const DEFAULT_DATABASE_URL = 'postgresql://spc:spc@localhost:5433/someones_pc'

export class MissingConfiguration extends Error {
  override readonly name = 'MissingConfiguration'

  private constructor(readonly key: string) {
    super(
      `${key} is set but empty. Give it a value in .env.local, or remove the line to use the default.`,
    )
  }

  static blank(key: string): MissingConfiguration {
    return new MissingConfiguration(key)
  }
}

/**
 * An unset `DATABASE_URL` means "the one Docker just started", which is what a
 * first clone wants. A set-but-empty one means somebody copied `.env.example`
 * and stopped, and guessing on their behalf would point them at a database
 * they did not choose — so that case is named rather than defaulted.
 */
export function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (url === undefined) return DEFAULT_DATABASE_URL
  if (url.trim() === '') throw MissingConfiguration.blank('DATABASE_URL')
  return url
}
