import { expect, test } from '@playwright/test'

test('muestra la home del MVP frontend', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'The Map World Game 2026' }),
  ).toBeVisible()
})
