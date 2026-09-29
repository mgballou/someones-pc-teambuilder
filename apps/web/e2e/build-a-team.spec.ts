import { expect, test } from '@playwright/test'
import { addPokemon, createTeam, DEMO_STATE, openTeams, signIn, signUpFresh } from './steps'

/**
 * The path a person actually walks: sign in, open a team, read the analysis,
 * duplicate a set. Runs against the seeded demo account.
 */

test.describe('signed in once', () => {
  test.use({ storageState: DEMO_STATE })

  test.beforeEach(async ({ page }) => {
    await openTeams(page)
  })

  test('the seeded teams are listed', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Reg H Rain/ })).toBeVisible()
  })

  test('a team opens on its build panel and the header persists across panels', async ({
    page,
  }) => {
    await page.getByRole('link', { name: /OU Balance/ }).click()

    await expect(page.getByRole('heading', { name: 'OU Balance' })).toBeVisible()

    await page.getByRole('link', { name: 'Coverage' }).click()
    await expect(page.getByRole('heading', { name: 'OU Balance' })).toBeVisible()
    await expect(page.getByText('Shared weaknesses')).toBeVisible()

    await page.getByRole('link', { name: 'Speed' }).click()
    await expect(page.getByRole('heading', { name: 'OU Balance' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ladder' })).toBeVisible()
  })

  test('OU Balance puts Dragapult 421 above the Weavile benchmark at speed', async ({ page }) => {
    await page.getByRole('link', { name: /OU Balance/ }).click()
    await page.getByRole('link', { name: 'Speed' }).click()
    await expect(page.getByRole('heading', { name: 'Ladder' })).toBeVisible()

    const ladder = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Ladder' }) })
    const entries = await ladder.innerText()
    const dragapult = entries.indexOf('Max Speed Jolly Dragapult')
    const weavile = entries.indexOf('Max Speed Jolly Weavile')
    const dragapultSet = page
      .getByRole('table')
      .getByRole('row', { name: /Dragapult/ })
      .getByRole('cell')
      .nth(2)

    await expect(dragapultSet).toHaveText('421')
    await expect(
      ladder.getByRole('listitem').filter({ hasText: 'Max Speed Jolly Weavile' }),
    ).toContainText('383')
    expect(dragapult).toBeGreaterThanOrEqual(0)
    expect(weavile).toBeGreaterThanOrEqual(0)
    expect(dragapult).toBeLessThan(weavile)
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
})

test('a new OU team adds species at level 100', async ({ page }) => {
  await signUpFresh(page)
  await createTeam(page, 'OU Balance')
  await addPokemon(page, 'Weavile')
  await page
    .getByRole('article', { name: 'Slot 1: Weavile' })
    .getByRole('link', { name: 'Edit' })
    .click()

  await expect(page.getByLabel('Level')).toHaveValue('100')
})

test('a set duplicates in place', async ({ page }) => {
  await signIn(page)
  await page.getByRole('link', { name: /Reg H Rain/ }).click()

  const cards = page.getByRole('article')
  await expect(cards.first()).toBeVisible()
  const before = await cards.count()

  await cards.first().getByRole('button', { name: 'Duplicate this set' }).click()

  await expect(cards).toHaveCount(before + 1)
})
