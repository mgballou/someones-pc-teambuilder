import { expect, test } from '@playwright/test'
import { DEMO, signIn } from './steps'

test('a signed-out visit to the Box goes to sign-in', async ({ page }) => {
  await page.goto('/box')

  await expect(page).toHaveURL('/sign-in')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('a wrong password is refused next to the form', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(DEMO.email)
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('main').getByRole('alert')).toHaveText(
    'No account with that email and password.',
  )
  await expect(page).toHaveURL('/sign-in')
})

test('the sign-in form offers an account to someone without one', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByRole('link', { name: 'Create one' }).click()

  await expect(page).toHaveURL('/sign-up')
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible()
})

test('the demo account signs in to its teams and signs out to the landing page', async ({
  page,
}) => {
  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()

  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('heading', { name: 'A planning companion for competitive Pokémon.' }),
  ).toBeVisible()
})
