import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { disposableUrl, E2E_DATABASE_URL } from './database'

/**
 * `pnpm test:e2e`: a database of its own, then the browser suite against it.
 *
 * With no `E2E_DATABASE_URL`, it starts the `db-e2e` service from
 * `docker-compose.yml` fresh, pushes the schema, seeds the demo account, runs
 * Playwright and removes the container, whether the suite passed or not. With
 * one, as in CI, it pushes and seeds that database instead and leaves its
 * lifetime to whoever started it. Either way the name has to pass
 * `disposableUrl`, and the developer's own database is never opened.
 *
 * Arguments are passed through to `playwright test`.
 */

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const webRoot = fileURLToPath(new URL('..', import.meta.url))

const given = process.env.E2E_DATABASE_URL
const url = disposableUrl(given ?? E2E_DATABASE_URL)
const env = { ...process.env, DATABASE_URL: url }
const ownsDatabase = given === undefined

function run(command: string, args: readonly string[], cwd: string): number {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
  return result.status ?? 1
}

// Ctrl-C reaches Playwright too. Waiting for it to stop, rather than dying
// first, is what lets the container come down afterwards.
process.on('SIGINT', () => {})

function main(): number {
  if (ownsDatabase) {
    const up = run(
      'docker',
      ['compose', 'up', '--detach', '--wait', '--force-recreate', 'db-e2e'],
      repoRoot,
    )
    if (up !== 0) {
      console.error(
        'Could not start the e2e database on port 5434. Start Docker, or set E2E_DATABASE_URL to a Postgres whose name ends in "_e2e".',
      )
      return up
    }
  }

  try {
    const pushed = run('pnpm', ['db:push'], webRoot)
    if (pushed !== 0) return pushed
    const seeded = run('pnpm', ['db:seed'], webRoot)
    if (seeded !== 0) return seeded
    return run('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], webRoot)
  } finally {
    if (ownsDatabase) run('docker', ['compose', 'rm', '--stop', '--force', 'db-e2e'], repoRoot)
  }
}

process.exit(main())
