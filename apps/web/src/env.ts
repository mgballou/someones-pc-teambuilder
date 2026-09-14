import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * `.env.local`, for the entry points Next does not start.
 *
 * `next dev` reads `apps/web/.env.local` on its own. `pnpm db:push` and
 * `pnpm db:seed` do not — `drizzle-kit` and `tsx` both leave env files alone —
 * so a newcomer who filled one in watched the two commands the README told
 * them to run ignore it. This is that file, loaded the same way, for them.
 *
 * **Importing this module is what loads the file**, so it has to be imported
 * ahead of anything that reads `process.env` at module scope, which is why the
 * seed script imports it above `./client` rather than calling a function in
 * its body. ES modules evaluate their imports first; a call would be too late.
 *
 * The path is resolved from this module rather than from `process.cwd()`,
 * because `pnpm --filter` and `drizzle-kit` do not agree on what the working
 * directory is. A real environment variable still wins over the file, which is
 * how CI sets `DATABASE_URL` without keeping an env file at all.
 */

const ENV_FILE = fileURLToPath(new URL('../.env.local', import.meta.url))

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE)
