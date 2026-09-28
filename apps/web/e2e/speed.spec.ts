import { expect, test, type Page } from '@playwright/test'
import { DEMO_STATE, openPanel, openTeams } from './steps'

test.use({ storageState: DEMO_STATE })

test.beforeEach(async ({ page }) => {
  await openTeams(page)
  await openPanel(page, 'Reg H Rain', 'Speed')
})

function panel(page: Page, title: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title }) })
}

function speedOf(entry: string): number {
  return Number(/(\d+)$/.exec(entry)?.[1])
}

test('the ladder is read at the format level and says where its benchmarks come from', async ({
  page,
}) => {
  const ladder = panel(page, 'Ladder')

  await expect(
    ladder.getByText('Level 50, fastest first, read against a clear field'),
  ).toBeVisible()
  await expect(
    ladder.getByText(
      'Computed from base stats in the dataset, at maximum Speed investment with a Speed-raising nature, for the species this format allows. Not usage statistics — this app has none.',
    ),
  ).toBeVisible()
})

test('each member sits at its computed Speed, and a tie is marked', async ({ page }) => {
  const ladder = panel(page, 'Ladder').getByRole('listitem')

  await expect(ladder.filter({ hasText: /^Amoonguss/ })).toHaveText('Amoonguss35')
  await expect(ladder.filter({ hasText: /^Barraskewda/ })).toHaveText('Barraskewda188')
  await expect(ladder.filter({ hasText: /^Rillaboom/ })).toHaveText('Rillaboom=105')
  await expect(ladder.filter({ hasText: /^Archaludon/ })).toHaveText('Archaludon=105')
})

test('Trick Room reverses the ladder and changes no number', async ({ page }) => {
  const ladder = panel(page, 'Ladder').getByRole('listitem')
  const trickRoom = panel(page, 'Under Trick Room').getByRole('listitem')

  await expect(trickRoom.first()).toHaveText('Amoonguss35')
  const fastestFirst = (await ladder.allTextContents()).map(speedOf)
  const slowestFirst = (await trickRoom.allTextContents()).map(speedOf)
  expect(slowestFirst).toEqual(fastestFirst.toReversed())
})

test('the members table reads each modifier and names what the panel leaves out', async ({
  page,
}) => {
  const members = panel(page, 'Members')
  const barraskewda = members.getByRole('row', { name: /Barraskewda/ })

  await expect(members.getByRole('columnheader', { name: 'Field ability' })).toBeVisible()
  await expect(barraskewda.getByRole('cell').nth(2)).toHaveText('188')
  await expect(barraskewda.getByRole('cell').last()).toHaveText('94')
  await expect(panel(page, 'Not accounted for')).toContainText(
    'Abilities that need a turn or a trigger — Speed Boost, Unburden, Quick Feet, Steam Engine',
  )
})
