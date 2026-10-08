import { expect, test } from '@playwright/test'
import { createTeam, DEMO_STATE, openTeams, signUpFresh } from './steps'

test.describe('signed in once', () => {
  test.use({ storageState: DEMO_STATE })

  test('the seeded teams list with their member counts', async ({ page }) => {
    await openTeams(page)

    await expect(page.getByRole('link', { name: /Reg G Miraidon/ })).toContainText('6 of 6')
    await expect(page.getByRole('link', { name: /OU Balance/ })).toContainText('6 of 6')
  })
})

test('an account with no teams is offered its first one', async ({ page }) => {
  await signUpFresh(page)

  const empty = page
    .getByRole('main')
    .locator('section')
    .filter({ hasText: 'No teams yet. Start one, or paste a Showdown export into it.' })
  await expect(empty).toBeVisible()
  await expect(empty.getByRole('button', { name: 'New team' })).toBeVisible()
})

test('a new team opens on its Build panel and joins the list', async ({ page }) => {
  await signUpFresh(page)

  await createTeam(page, 'Sand Offense')

  await expect(page).toHaveURL(/\/teams\/[^/]+$/)
  await expect(page.getByText('0 of 6')).toBeVisible()

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Teams' }).click()

  await expect(page.getByRole('link', { name: /Sand Offense/ })).toContainText('0 of 6')
  await expect(page.getByText('No teams yet.')).toHaveCount(0)
})

test('cancelling the New team dialog creates nothing', async ({ page }) => {
  await signUpFresh(page)

  await page.getByRole('button', { name: 'New team' }).first().click()
  await page.getByRole('dialog').getByLabel('Name').fill('Discarded')
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(
    page.getByText('No teams yet. Start one, or paste a Showdown export into it.'),
  ).toBeVisible()
})
