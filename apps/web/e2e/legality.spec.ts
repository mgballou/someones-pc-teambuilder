import { expect, test, type Page } from '@playwright/test'
import {
  SMOGON_STALE_AFTER_DAYS,
  SMOGON_VERIFIED_ON,
  VGC_STALE_AFTER_DAYS,
  VGC_VERIFIED_ON,
} from '@spc/core'
import { openPanel, signIn } from './steps'

test.beforeEach(async ({ page }) => {
  await signIn(page)
})

function panel(page: Page, title: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title }) })
}

/** What the Checked row should say today, counted here rather than read back from the app. */
function checked(verifiedOn: string, staleAfterDays: number): string {
  const today = new Date().toISOString().slice(0, 10)
  const age = (Date.parse(today) - Date.parse(verifiedOn)) / 86_400_000
  const read = age <= 0 ? 'read today' : age === 1 ? 'read 1 day ago' : `read ${age} days ago`
  const window = age > staleAfterDays ? `, past its ${staleAfterDays}-day window` : ''
  return `${verifiedOn} · ${read}${window}`
}

test('a violated rule is named, with the rule it breaks', async ({ page }) => {
  await openPanel(page, 'Reg G Miraidon', 'Legality')

  const verdict = panel(page, 'Not legal')
  await expect(verdict.getByText('1 problem', { exact: true })).toBeVisible()
  await expect(verdict.getByRole('listitem')).toHaveCount(1)
  await expect(verdict.getByText('Item Clause', { exact: true })).toBeVisible()
  await expect(
    verdict.getByText('2 Pokémon hold Assault Vest. VGC Regulation G allows one of each item.'),
  ).toBeVisible()
  await expect(verdict.getByText('No two Pokémon may hold the same item.')).toBeVisible()
})

test('the verdict sits beside its authority and how long ago it was checked', async ({ page }) => {
  await openPanel(page, 'Reg G Miraidon', 'Legality')

  const ruleset = panel(page, 'Ruleset')
  await expect(ruleset.getByText('Authority').locator('xpath=following-sibling::dd[1]')).toHaveText(
    'vgc',
  )
  await expect(ruleset.getByText('Checked').locator('xpath=following-sibling::dd[1]')).toHaveText(
    checked(VGC_VERIFIED_ON, VGC_STALE_AFTER_DAYS),
  )
  await expect(ruleset.getByText(/This is a curated snapshot, not a live feed\./)).toBeVisible()
})

test('a legal team says what was checked, and that the ruleset is kept by hand', async ({
  page,
}) => {
  await openPanel(page, 'OU Balance', 'Legality')

  await expect(panel(page, 'Legal').getByText('0 problems')).toBeVisible()
  await expect(
    page.getByText('This team satisfies every rule in Smogon Gen 9 OU that this app checks.'),
  ).toBeVisible()

  const ruleset = panel(page, 'Ruleset')
  await expect(ruleset.getByText('Checked').locator('xpath=following-sibling::dd[1]')).toHaveText(
    checked(SMOGON_VERIFIED_ON, SMOGON_STALE_AFTER_DAYS),
  )
  await expect(
    ruleset.getByText(
      /These rulesets are maintained by hand — PokéAPI has no concept of a tier or a regulation\. Check the current official rules before entering a tournament\.$/,
    ),
  ).toBeVisible()
})
