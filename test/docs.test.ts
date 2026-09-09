import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The prose, checked against the repository it describes.
 *
 * The fixture was counted three different ways at once — thirteen species in
 * the README, nine in `CLAUDE.md`, nine again in the design spec — and it held
 * neither number. A count in prose is a number nothing can keep true, so the
 * rule is that the prose does not carry one and this test enforces it.
 */

const root = fileURLToPath(new URL('..', import.meta.url))

function markdown(dir: string): readonly string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...markdown(full))
    else if (entry.endsWith('.md')) out.push(full)
  }
  return out
}

const PROSE = [join(root, 'README.md'), join(root, 'CLAUDE.md'), ...markdown(join(root, 'docs'))]

/** "a nine-species fixture", "13 species fixture", and every relative. */
const COUNTED_FIXTURE =
  /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty)[ -]species fixture\b/i

describe('the prose', () => {
  it.each(PROSE.map((file) => file.slice(root.length)))('%s counts no fixture', (relative) => {
    expect(readFileSync(join(root, relative), 'utf8')).not.toMatch(COUNTED_FIXTURE)
  })

  it('catches a count if one comes back', () => {
    expect('testable against a nine-species fixture').toMatch(COUNTED_FIXTURE)
  })

  it('points the README at an env example that exists', () => {
    const readme = readFileSync(join(root, 'README.md'), 'utf8')
    const named = [...readme.matchAll(/`([\w./-]*\.env\.example)`/g)].map((match) => match[1] ?? '')
    expect(named.every((path) => existsSync(join(root, path)))).toBe(true)
  })

  it('names an env example at all', () => {
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toContain('apps/web/.env.example')
  })
})
