import { test as setup } from '@playwright/test'
import { DEMO_STATE, signIn } from './steps'

setup('the demo account signs in once for the specs that only read', async ({ page }) => {
  await signIn(page)
  await page.context().storageState({ path: DEMO_STATE })
})
