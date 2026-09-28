import { defineConfig, devices } from '@playwright/test'
import { disposableUrl, E2E_DATABASE_URL } from './e2e/database'

/**
 * The suite starts its own server, on its own port, against the database
 * `pnpm test:e2e` prepared, and never borrows a server that is already
 * running: one on 3000 is a developer's, reading the developer's data.
 *
 * It is a production build rather than `next dev` because Next allows one dev
 * server per directory, and the developer's may be the one running.
 */

const PORT = 3100
const baseURL = `http://localhost:${PORT}`
const databaseUrl = disposableUrl(process.env.DATABASE_URL ?? E2E_DATABASE_URL)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI === undefined ? 0 : 2,
  reporter: 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [
    { name: 'setup', testMatch: /\.setup\.ts$/, use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
  webServer: {
    command: `next build && next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    env: { DATABASE_URL: databaseUrl },
  },
})
