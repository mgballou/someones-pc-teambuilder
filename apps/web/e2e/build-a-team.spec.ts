import { expect, test } from '@playwright/test'

/**
 * The path a person actually walks: sign in, open a team, read the analysis,
 * duplicate a set. Runs against the seeded demo account.
 */

const EMAIL = 'demo@someones.pc'
const PASSWORD = 'competitive'

test.beforeEach(async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/teams')
})

test('the seeded teams are listed', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Reg H Rain/ })).toBeVisible()
})

test('a team opens on its build panel and the header persists across panels', async ({ page }) => {
  await page.getByRole('link', { name: /OU Balance/ }).click()

  await expect(page.getByRole('heading', { name: 'OU Balance' })).toBeVisible()

  await page.getByRole('link', { name: 'Coverage' }).click()
  await expect(page.getByRole('heading', { name: 'OU Balance' })).toBeVisible()
  await expect(page.getByText('Shared weaknesses')).toBeVisible()

  await page.getByRole('link', { name: 'Speed' }).click()
  await expect(page.getByRole('heading', { name: 'OU Balance' })).toBeVisible()
  await expect(page.getByText('Ladder')).toBeVisible()
})

test('the legality panel names its source', async ({ page }) => {
  await page.getByRole('link', { name: /OU Balance/ }).click()
  await page.getByRole('link', { name: 'Legality' }).click()

  await expect(page.getByText(/maintained by hand/)).toBeVisible()
  await expect(page.getByText(/Checked/)).toBeVisible()
})

test('a set duplicates in place', async ({ page }) => {
  await page.getByRole('link', { name: /Reg H Rain/ }).click()

  const cards = page.getByRole('article')
  await expect(cards.first()).toBeVisible()
  const before = await cards.count()

  await cards.first().getByRole('button', { name: 'Duplicate this set' }).click()

  await expect(cards).toHaveCount(before + 1)
})
