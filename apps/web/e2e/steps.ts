import { randomUUID } from 'node:crypto'
import { expect, type Page } from '@playwright/test'

/**
 * The steps every spec takes on the way to what it checks.
 *
 * A spec that only reads uses the seeded demo account. A spec that writes
 * signs up an account of its own, so what it adds never shows up in another
 * spec's assertions, however the files are scheduled across workers.
 */

export type Account = { readonly email: string; readonly password: string }

export const DEMO: Account = { email: 'demo@someones.pc', password: 'competitive' }

export async function signIn(page: Page, account: Account = DEMO): Promise<void> {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/teams')
}

export async function signUpFresh(page: Page): Promise<Account> {
  const account = { email: `e2e-${randomUUID()}@someones.pc`, password: 'competitive' }
  await page.goto('/sign-up')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('/teams')
  return account
}

/** From the Teams page, through the New team dialog, to the new team's Build panel. */
export async function createTeam(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'New team' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByLabel('Format').selectOption({ label: 'Smogon Gen 9 OU' })
  await dialog.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
}

/** Fills the first empty slot of the open team. */
export async function addPokemon(page: Page, species: string): Promise<void> {
  await page.getByRole('button', { name: 'Add a Pokémon' }).click()
  await page.getByLabel('Search species').fill(species.toLowerCase())
  await page.getByRole('button', { name: species, exact: true }).click()
  await expect(page.getByRole('article', { name: new RegExp(`: ${species}$`) })).toBeVisible()
}

export type TeamPanel = 'Damage' | 'Speed' | 'Coverage' | 'Legality'

/** From the Teams page, into one of the demo account's seeded teams and on to a panel. */
export async function openPanel(page: Page, team: string, panel: TeamPanel): Promise<void> {
  await page.getByRole('link', { name: new RegExp(team) }).click()
  await expect(page.getByRole('heading', { name: team, level: 1 })).toBeVisible()
  await page.getByRole('link', { name: new RegExp(`^${panel}`) }).click()
  await expect(page).toHaveURL(new RegExp(`/${panel.toLowerCase()}$`))
}
