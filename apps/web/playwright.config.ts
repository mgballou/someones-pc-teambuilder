import { defineConfig, devices } from '@playwright/test'

/**
 * `SPC_BASE_URL` points the suite at an already-running server, which is how
 * it runs when port 3000 is taken. Unset, it starts its own on 3000.
 */
const baseURL = process.env.SPC_BASE_URL ?? 'http://localhost:3000'
const external = process.env.SPC_BASE_URL !== undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI === undefined ? 0 : 2,
  reporter: 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(external
    ? {}
    : {
        webServer: {
          command: 'pnpm dev',
          url: baseURL,
          reuseExistingServer: process.env.CI === undefined,
          timeout: 120_000,
        },
      }),
})
