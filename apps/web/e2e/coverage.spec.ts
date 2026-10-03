import { expect, test, type Page } from '@playwright/test'
import { DEMO_STATE, openPanel, openTeams } from './steps'

test.use({ storageState: DEMO_STATE })

test.beforeEach(async ({ page }) => {
  await openTeams(page)
  await openPanel(page, 'OU Balance', 'Coverage')
})

function panel(page: Page, title: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title }) })
}

test('the defensive grid prints a multiplier for every member against all eighteen types', async ({
  page,
}) => {
  const grid = panel(page, 'Defensive').getByRole('table')

  await expect(grid.getByRole('columnheader')).toHaveCount(19)
  await expect(grid.locator('tbody tr')).toHaveCount(6)
  await expect(grid.locator('tbody td')).toHaveCount(6 * 18)
})

test('a cell reads the chart for that member and that type', async ({ page }) => {
  const grid = panel(page, 'Defensive').getByRole('table')
  const cell = (member: string, column: number) =>
    grid
      .getByRole('row', { name: new RegExp(`^${member}`) })
      .getByRole('cell')
      .nth(column)

  await expect(cell('Kingambit', 6)).toHaveText('4')
  await expect(cell('Great Tusk', 3)).toHaveText('0')
  await expect(cell('Gholdengo', 0)).toHaveText('0')
  await expect(cell('Dragapult', 0)).toHaveText('0')
  await expect(cell('Ting-Lu', 0)).toHaveText('·')
})

test('shared weaknesses count the members that share them', async ({ page }) => {
  const ice = panel(page, 'Shared weaknesses')
    .getByRole('listitem')
    .filter({ hasText: 'Great Tusk, Dragapult, Ting-Lu' })
    .first()

  await expect(ice).toContainText('Ice')
  await expect(ice).toContainText('3')
})

test('the gaps and the notes say what the grid cannot read', async ({ page }) => {
  await expect(
    panel(page, 'Gaps').getByText('Typings in OU nothing on the team hits for 2×'),
  ).toBeVisible()
  await expect(
    panel(page, 'Gaps').getByText(/^Measured against a whole Pokémon, not one type at a time/),
  ).toBeVisible()
  await expect(panel(page, 'Unresisted')).toContainText('Ground')

  const notes = panel(page, 'Not accounted for')
  await expect(
    notes.getByText(
      'Kingambit: supreme-overlord is not modelled here. If it changes what this Pokémon takes, the row does not show it.',
    ),
  ).toBeVisible()
  await expect(
    notes.getByText(
      'Offensive coverage reads typing alone. Levitate, Flash Fire and every other ability immunity sit on the other side of the screen and cannot be read from here.',
    ),
  ).toBeVisible()
})
