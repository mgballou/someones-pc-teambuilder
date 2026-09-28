/**
 * Which database the browser suite may write to.
 *
 * The suite signs in as the demo account and changes it, and the seed it runs
 * first deletes that account and writes it again. Pointed at the database a
 * developer builds teams in, one run would replace their demo data and leave
 * duplicated sets behind. So the suite runs only against a database whose name
 * says it is disposable, and the check sits in both places that could start
 * it: `pnpm test:e2e` and `playwright.config.ts`.
 */

/** The Postgres the `db-e2e` service in `docker-compose.yml` publishes. */
export const E2E_DATABASE_URL = 'postgresql://spc:spc@localhost:5434/someones_pc_e2e'

const DISPOSABLE_SUFFIX = '_e2e'

export class NotDisposable extends Error {
  override readonly name = 'NotDisposable'

  private constructor(database: string) {
    super(
      `The e2e suite rewrites the demo account, so it runs only against a database whose name ends in "${DISPOSABLE_SUFFIX}", and "${database}" does not. Run it with \`pnpm test:e2e\`, which starts its own.`,
    )
  }

  static database(database: string): NotDisposable {
    return new NotDisposable(database)
  }
}

/** The database name in a Postgres URL, or '' when it names none. */
export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1))
}

export function isDisposable(url: string): boolean {
  return databaseName(url).endsWith(DISPOSABLE_SUFFIX)
}

/** `url` when the suite may write to it; throws `NotDisposable` otherwise. */
export function disposableUrl(url: string): string {
  if (!isDisposable(url)) throw NotDisposable.database(databaseName(url))
  return url
}
