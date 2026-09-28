import { expect, test } from '@playwright/test'
import { addPokemon, createTeam, DEMO_STATE, openTeams, signUpFresh } from './steps'

test.describe('signed in once', () => {
  test.use({ storageState: DEMO_STATE })

  test('a full team shows its six sets and no empty slot', async ({ page }) => {
    await openTeams(page)
    await page.getByRole('link', { name: /Reg G Miraidon/ }).click()

    await expect(page.getByRole('article')).toHaveCount(6)
    await expect(page.getByLabel(/^Slot \d+, empty$/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Add a Pokémon' })).toHaveCount(0)
  })
})

test('an empty team offers one control, in its first slot', async ({ page }) => {
  await signUpFresh(page)
  await createTeam(page, 'Empty')

  await expect(page.getByLabel(/^Slot \d+, empty$/)).toHaveCount(6)
  await expect(page.getByRole('button', { name: 'Add a Pokémon' })).toHaveCount(1)
  await expect(
    page.getByLabel('Slot 1, empty').getByRole('button', { name: 'Add a Pokémon' }),
  ).toBeVisible()
})

test('adding a Pokémon fills the first slot and moves the control to the next', async ({
  page,
}) => {
  await signUpFresh(page)
  await createTeam(page, 'Sand')

  await addPokemon(page, 'Garchomp')

  await expect(page.getByRole('article', { name: 'Slot 1: Garchomp' })).toBeVisible()
  await expect(page.getByLabel(/^Slot \d+, empty$/)).toHaveCount(5)
  await expect(
    page.getByLabel('Slot 2, empty').getByRole('button', { name: 'Add a Pokémon' }),
  ).toBeVisible()
  await expect(page.getByText('1 of 6')).toBeVisible()
})

test('Escape closes the species picker and gives the slot back its one control', async ({
  page,
}) => {
  await signUpFresh(page)
  await createTeam(page, 'Undecided')

  await page.getByRole('button', { name: 'Add a Pokémon' }).click()
  await page.getByLabel('Search species').press('Escape')

  await expect(page.getByLabel('Search species')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add a Pokémon' })).toBeVisible()
})
