import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `.env.example` is a promise, and for three of its four variables it was not
 * kept: `AUTH_SECRET`, `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` were read by
 * nothing in the repository. Sessions here are opaque rows in Postgres, so
 * there was never a secret to sign with, and there is no OAuth code to
 * configure. A newcomer generated a key for nobody.
 */

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const webRoot = join(repoRoot, 'apps/web')

function sourceFiles(dir: string): readonly string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(full)
  }
  return out
}

const SOURCES = [
  ...sourceFiles(join(webRoot, 'src')),
  ...sourceFiles(join(repoRoot, 'packages')),
  join(webRoot, 'drizzle.config.ts'),
  join(webRoot, 'playwright.config.ts'),
  join(webRoot, 'next.config.ts'),
]

const CORPUS = SOURCES.map((file) => readFileSync(file, 'utf8')).join('\n')

const DECLARED = readFileSync(join(webRoot, '.env.example'), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))
  .map((line) => line.split('=')[0] ?? '')

describe('.env.example', () => {
  it('declares at least one variable', () => {
    expect(DECLARED.length).toBeGreaterThan(0)
  })

  it.each(DECLARED)('%s is read by the code', (key) => {
    expect(CORPUS).toContain(`process.env.${key}`)
  })

  it('does not ask for an auth secret the app has no use for', () => {
    expect(DECLARED).not.toContain('AUTH_SECRET')
  })
})
