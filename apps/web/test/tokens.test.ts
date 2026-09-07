/**
 * The token vocabulary, held to its own numbers.
 *
 * Ported from `character-bible/test/tokens.test.js`, which is the first
 * implementation of the house rule in `ui-sensibility.md` §16: contrast ratios
 * are **recomputed from the token values**, so changing one tells you what it
 * did. A ratio asserted against a number somebody typed once is a test of the
 * typing, and it goes stale the first time somebody edits a color.
 *
 * None of what this catches is visible by eye. It becomes visible when somebody
 * with less than perfect contrast sensitivity uses the app, which is why "it
 * looks fine" is not evidence here.
 *
 * Four of the source file's tests did not come across, because this app has no
 * such thing: shadcn's vocabulary (no shadcn), the `data-slot` frame seam (no
 * primitive layer addressed that way), the hue-free plate ground (no plates),
 * and the duration tokens under reduced motion (no `--dur-*` tokens; the
 * preference is honored by a blanket override instead, asserted below).
 */

import { test } from 'vitest'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseOklch, contrast, outOfGamut, tokenBlock } from './oklch'
import type { Oklch } from './oklch'

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const read = (name: string): string => fs.readFileSync(path.join(SRC, name), 'utf8')

const tokens = read('app/globals.css')

const THEMES = {
  light: ':root {',
  'dark, from the platform': ":root:not([data-theme='light']) {",
  'dark, chosen': ":root[data-theme='dark'] {",
} as const

const blocks: Record<string, Map<string, string>> = Object.fromEntries(
  Object.entries(THEMES).map(([name, start]) => [name, tokenBlock(tokens, start)]),
)

const block = (theme: string): Map<string, string> => {
  const found = blocks[theme]
  assert.ok(found, `no token block for ${theme}`)
  return found
}

// ---------------------------------------------------------------- the contract

test('every theme declares the same set of token names', () => {
  const names = Object.entries(blocks).map(
    ([theme, map]) => [theme, [...map.keys()].sort()] as const,
  )
  const first = names[0]
  assert.ok(first, 'no themes found')
  const [firstTheme, expected] = first
  for (const [theme, got] of names.slice(1)) {
    const missing = expected.filter((n) => !got.includes(n))
    const extra = got.filter((n) => !expected.includes(n))
    assert.deepEqual(
      { missing, extra },
      { missing: [], extra: [] },
      `${theme} does not declare the same set as ${firstTheme}. ` +
        'A theme declaring a subset half-applies, and half-applied is worse than absent.',
    )
  }
})

test('the two dark blocks are the same block', () => {
  // One is the platform's answer and one is his; they must never drift, or the
  // toggle repaints into a theme the media query never showed anybody.
  assert.deepEqual(
    Object.fromEntries(block('dark, chosen')),
    Object.fromEntries(block('dark, from the platform')),
  )
})

// ---------------------------------------------------------------- contrast

const SURFACES = ['--page', '--panel', '--raised', '--well'] as const
const INK = [
  '--text',
  '--text-dim',
  '--text-faint',
  '--accent',
  '--danger',
  '--warn',
  '--ok',
] as const

const colors = (theme: string): ((name: string) => Oklch) => {
  const map = block(theme)
  return (name) => {
    const parsed = parseOklch(map.get(name))
    assert.ok(parsed, `${name} in ${theme} is not an oklch value: ${map.get(name)}`)
    return parsed
  }
}

const themeNames = ['light', 'dark, chosen']

test('every color token is inside sRGB', () => {
  for (const theme of themeNames) {
    for (const [name, value] of block(theme)) {
      const parsed = parseOklch(value)
      if (!parsed) continue
      assert.ok(
        !outOfGamut(parsed),
        `${name} in ${theme} (${value}) falls outside sRGB and will be silently clamped, ` +
          'which is a color nobody chose',
      )
    }
  }
})

test('every ink clears WCAG AA against every surface in its own theme', () => {
  for (const theme of themeNames) {
    const c = colors(theme)
    for (const ink of INK) {
      for (const surface of SURFACES) {
        const ratio = contrast(c(ink), c(surface))
        assert.ok(
          ratio >= 4.5,
          `${theme}: ${ink} on ${surface} is ${ratio.toFixed(2)}:1, under the 4.5 floor`,
        )
      }
    }
  }
})

test("a control's edge clears the 3:1 boundary floor, and a seam stays under it", () => {
  // The one contrast assertion that runs the other way. A hairline is a
  // ceiling: a seam loud enough to read as a boundary is a line doing a
  // control's job. §5 says depth comes from a line plus one surface step, so
  // the line is not the thing carrying the weight.
  for (const theme of themeNames) {
    const c = colors(theme)
    for (const surface of SURFACES) {
      const edge = contrast(c('--line-strong'), c(surface))
      assert.ok(
        edge >= 3,
        `${theme}: --line-strong on ${surface} is ${edge.toFixed(2)}:1, under the 3:1 floor ` +
          'for a control boundary (WCAG 1.4.11)',
      )
      const seam = contrast(c('--line'), c(surface))
      assert.ok(
        seam < 3,
        `${theme}: --line on ${surface} is ${seam.toFixed(2)}:1, above the hairline ceiling`,
      )
    }
  }
})

test('the ink on the accent clears AA, in both themes', () => {
  // §3: the accent is the one primary action per region, so this is the label
  // of the primary button on the primary button.
  for (const theme of themeNames) {
    const c = colors(theme)
    const ratio = contrast(c('--accent-ink'), c('--accent'))
    assert.ok(ratio >= 4.5, `${theme}: --accent-ink on --accent is ${ratio.toFixed(2)}:1`)
  }
})

test('no signal tone sits within 45 degrees of the accent', () => {
  // Two tones a person cannot tell apart are one tone carrying two meanings,
  // and §4.2 says the accent is the one that must win. The eighteen type hues
  // are exempt by §4.3: they are data, they cover the wheel by definition, and
  // they are never the accent's job.
  for (const theme of themeNames) {
    const c = colors(theme)
    const accent = c('--accent').h
    for (const tone of ['--danger', '--warn', '--ok']) {
      const d = Math.abs(((c(tone).h - accent + 540) % 360) - 180)
      assert.ok(
        d >= 45,
        `${theme}: ${tone} is ${d.toFixed(0)} degrees from --accent, under the 45 floor`,
      )
    }
  }
})

// ---------------------------------------------------------------- §4.1, §11

test('nothing outside the token definition names a raw value', () => {
  const raw = /#[0-9a-fA-F]{3,8}\b|oklch\(|rgba?\(|hsla?\(/
  const walk = (dir: string): readonly string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return walk(full)
      return /\.(ts|tsx|css)$/.test(entry.name) ? [full] : []
    })

  for (const file of walk(SRC)) {
    if (file === path.join(SRC, 'app', 'globals.css')) continue
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        assert.ok(
          !raw.test(line),
          `${path.relative(SRC, file)}:${i + 1} names a raw color, which the token layer ` +
            `exists to prevent:\n  ${line.trim()}`,
        )
      })
  }
})

test('the focus indicator is declared once, from the accent, with an offset', () => {
  // §11. An indicator set per component is an indicator removed with no
  // replacement on every component nobody remembered.
  const outlines = tokens.match(/^\s*outline:\s*[^;]+;/gm) ?? []
  assert.equal(
    outlines.length,
    1,
    `${outlines.length} outline declarations; the indicator is set once or it is not a system:\n` +
      outlines.map((o) => `  ${o.trim()}`).join('\n'),
  )
  assert.match(outlines[0] ?? '', /var\(--accent\)/)
  assert.match(tokens, /outline-offset:/)
})

test('reduced motion is honored where the transitions are declared', () => {
  // §9 — the preference lives beside the definitions, so no caller has to
  // remember it.
  assert.match(tokens, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(tokens, /transition-duration: 0\.01ms !important/)
})
