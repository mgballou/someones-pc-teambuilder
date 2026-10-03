import { expect, test, type Page } from '@playwright/test'
import { addPokemon, createTeam, signUpFresh } from './steps'

async function openBox(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Box' }).click()
  await expect(page.getByRole('heading', { name: 'Box', level: 1 })).toBeVisible()
}

/** Server actions post to the page they run on; the response is the write landing. */
function nextAction(page: Page) {
  return page.waitForResponse((response) => response.request().method() === 'POST')
}

test('an empty Box says how a set gets into it', async ({ page }) => {
  await signUpFresh(page)

  await openBox(page)

  await expect(
    page.getByText('The Box is empty. Save a set from a team and it appears here.'),
  ).toBeVisible()
})

test('a set saved from a team is in the Box and pulls into another team as a copy', async ({
  page,
}) => {
  await signUpFresh(page)
  await createTeam(page, 'Sand')
  await addPokemon(page, 'Garchomp')

  const saved = nextAction(page)
  await page
    .getByRole('article', { name: 'Slot 1: Garchomp' })
    .getByRole('button', { name: 'Save to the Box' })
    .click()
  await saved

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Teams' }).click()
  await createTeam(page, 'Rain')
  await openBox(page)

  const entry = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'Garchomp' }) })
  await expect(entry).toHaveCount(1)

  await entry.getByRole('button', { name: 'Add to team' }).click()
  await entry.getByRole('button', { name: 'Rain' }).click()
  await expect(entry.getByRole('button', { name: 'Add to team' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Teams' }).click()
  await page.getByRole('link', { name: /Rain/ }).click()

  await expect(page.getByRole('article', { name: 'Slot 1: Garchomp' })).toBeVisible()
  await expect(page.getByText('1 of 6')).toBeVisible()
})

test('a set deleted from the Box leaves the team it came from alone', async ({ page }) => {
  await signUpFresh(page)
  await createTeam(page, 'Sand')
  await addPokemon(page, 'Garchomp')

  const saved = nextAction(page)
  await page.getByRole('button', { name: 'Save to the Box' }).click()
  await saved

  await openBox(page)
  await page.getByRole('button', { name: 'Delete from the Box' }).click()

  await expect(
    page.getByText('The Box is empty. Save a set from a team and it appears here.'),
  ).toBeVisible()

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Teams' }).click()
  await page.getByRole('link', { name: /Sand/ }).click()

  await expect(page.getByRole('article', { name: 'Slot 1: Garchomp' })).toBeVisible()
})
