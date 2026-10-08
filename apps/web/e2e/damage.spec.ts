import { expect, test, type Page } from '@playwright/test'
import { DEMO_STATE, openPanel, openTeams } from './steps'

test.use({ storageState: DEMO_STATE })

test.beforeEach(async ({ page }) => {
  await openTeams(page)
  await openPanel(page, 'Reg H Rain', 'Damage')
})

function panel(page: Page, title: string) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: title }) })
}

async function chooseDefender(page: Page, species: string): Promise<void> {
  await panel(page, 'Defender').getByLabel('Species').fill(species.toLowerCase())
  await panel(page, 'Defender').getByRole('button', { name: species, exact: true }).click()
}

test('nothing is calculated until there is a defender', async ({ page }) => {
  await expect(
    panel(page, 'Result').getByText('Choose a defender and the rolls appear here.'),
  ).toBeVisible()
})

test('a calculation shows all sixteen rolls and says what it assumed', async ({ page }) => {
  const attacker = panel(page, 'Attacker')
  await attacker.getByLabel('Pokémon').selectOption({ label: 'Barraskewda' })
  await attacker.getByLabel('Move').selectOption({ label: 'Psychic Fangs' })
  await chooseDefender(page, 'Gyarados')

  const result = panel(page, 'Result')
  const rolls = result.getByText('All sixteen rolls').locator('xpath=following-sibling::div/span')

  // @smogon/calc 0.11.0: -1 252+ Atk Choice Band Barraskewda Psychic Fangs
  // vs. 0 HP / 0 Def Gyarados at level 50: 62-74 (36.4 - 43.5%).
  await expect(rolls).toHaveText([
    '62',
    '63',
    '64',
    '65',
    '65',
    '66',
    '67',
    '68',
    '68',
    '69',
    '70',
    '71',
    '71',
    '72',
    '73',
    '74',
  ])
  await expect(result.getByText('Target HP').locator('xpath=following-sibling::dd')).toHaveText(
    '170',
  )
  await expect(result.locator('p', { hasText: 'What this assumed:' })).toHaveText(
    "What this assumed: Barraskewda's Swift Swim is outside the damage model and was not applied. Intimidate was applied as -1 Atk. Clear it from the attacker's boosts if it is already counted there. Psychic Fangs only ever hits one Pokémon, so no spread reduction was applied despite 2 targets.",
  )
})

test('a +1 Attack stage cancels the stage Intimidate takes', async ({ page }) => {
  const attacker = panel(page, 'Attacker')
  await attacker.getByLabel('Pokémon').selectOption({ label: 'Barraskewda' })
  await attacker.getByLabel('Move').selectOption({ label: 'Psychic Fangs' })
  await attacker.getByLabel('Boost').selectOption('1')
  await chooseDefender(page, 'Gyarados')

  const rolls = panel(page, 'Result')
    .getByText('All sixteen rolls')
    .locator('xpath=following-sibling::div/span')

  // @smogon/calc 0.11.0: 252+ Atk Choice Band Barraskewda Psychic Fangs
  // vs. 0 HP / 0 Def Gyarados at level 50: 93-110 (54.7 - 64.7%).
  await expect(rolls).toHaveText([
    '93',
    '94',
    '95',
    '96',
    '97',
    '99',
    '100',
    '101',
    '102',
    '103',
    '104',
    '105',
    '106',
    '107',
    '108',
    '110',
  ])
})
