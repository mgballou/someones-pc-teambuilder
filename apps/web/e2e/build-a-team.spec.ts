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
  await expect(page.getByRole('heading', { name: 'Ladder' })).toBeVisible()
})

test('the legality panel names its source', async ({ page }) => {
  await page.getByRole('link', { name: /OU Balance/ }).click()
  await page.getByRole('link', { name: 'Legality' }).click()

  await expect(page.getByText(/maintained by hand/)).toBeVisible()
  await expect(page.getByText(/Checked/)).toBeVisible()
})

test('the speed panel takes a field and the ladder moves', async ({ page }) => {
  await page.getByRole('link', { name: /Reg H Rain/ }).click()
  await page.getByRole('link', { name: 'Speed' }).click()

  const ladder = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Ladder' }) })
  const fastest = ladder.getByRole('listitem').first()

  await expect(page.getByText('read against a clear field').first()).toBeVisible()
  await expect(fastest).toContainText('Max Speed')
  await expect(page.getByText(/swift-swim is dormant/)).toBeVisible()

  await page.getByLabel('Weather').selectOption('rain')

  await expect(page).toHaveURL(/weather=rain/)
  await expect(page.getByText('read against rain').first()).toBeVisible()
  await expect(fastest).toContainText('Barraskewda')
  await expect(page.getByText(/swift-swim is dormant/)).toHaveCount(0)
})

test('a linked field is the field the panel opens on', async ({ page }) => {
  await page.getByRole('link', { name: /Reg H Rain/ }).click()
  await page.getByRole('link', { name: 'Speed' }).click()
  await expect(page).toHaveURL(/\/speed$/)

  await page.goto(`${new URL(page.url()).pathname}?weather=rain&terrain=grassy`)

  await expect(page.getByText('read against rain and Grassy Terrain').first()).toBeVisible()
})

test('a set duplicates in place', async ({ page }) => {
  await page.getByRole('link', { name: /Reg H Rain/ }).click()

  const cards = page.getByRole('article')
  await expect(cards.first()).toBeVisible()
  const before = await cards.count()

  await cards.first().getByRole('button', { name: 'Duplicate this set' }).click()

  await expect(cards).toHaveCount(before + 1)
})
