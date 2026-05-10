import { expect, test } from '@playwright/test'

async function goToSetup(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /Comenzar setup/i }).click()
}

test.describe('F8.2 — flujo e2e', () => {
  test('setup inválido: nombre vacío bloquea inicio y muestra error de schema', async ({ page }) => {
    await goToSetup(page)

    await page.locator('#player-name-1').fill('')

    await expect(page.getByRole('button', { name: /Iniciar partida/i })).toBeDisabled()
    await expect(page.getByText('Player names cannot be empty.')).toBeVisible()
    await expect(page.getByTestId('game-shell')).toHaveCount(0)
  })

  test('happy path: 2 rondas con clics en mapa hasta resultados', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await goToSetup(page)

    await page.locator('#question-count').fill('2')
    await page.getByRole('button', { name: /Iniciar partida/i }).click()

    await expect(page.getByTestId('game-shell')).toBeVisible()
    await expect(page.getByTestId('round-prompt')).toBeVisible()

    await expect(page.locator('path[data-iso]')).not.toHaveCount(0, { timeout: 45_000 })

    for (let i = 0; i < 2; i += 1) {
      const iso2 = await page.getByTestId('round-prompt').getAttribute('data-target-iso2')
      expect(iso2).toBeTruthy()

      const target = page.locator(`path[data-iso="${iso2}"]`).first()
      await expect(target).toBeVisible({ timeout: 20_000 })
      await target.scrollIntoViewIfNeeded()

      for (let attempt = 0; attempt < 3; attempt += 1) {
        await target.click()
        try {
          await expect(page.getByTestId('guess-feedback')).toBeVisible({ timeout: 5000 })
          break
        } catch {
          if (attempt === 2) {
            throw new Error(`No se registró respuesta tras clic en ISO ${iso2} (intento ${attempt + 1})`)
          }
        }
      }

      if (i < 1) {
        await page.getByTestId('advance-round-button').click()
        await expect(page.getByTestId('round-prompt')).toBeVisible()
      } else {
        await page.getByTestId('advance-round-button').click()
      }
    }

    await expect(page.getByTestId('game-finished-status')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('game-finished-status')).toContainText(/finalizada por rondas/i)
    await expect(page.locator('[data-testid^="finished-rank-"]')).toHaveCount(1)
  })
})

test.describe('F8.3 — anti-cheat estricto (visibilidad)', () => {
  test('document.hidden + visibilitychange aborta la partida y actualiza resultados', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await goToSetup(page)

    await page.getByRole('radio', { name: /Estricto/i }).check()
    await page.locator('#question-count').fill('1')
    await page.getByRole('button', { name: /Iniciar partida/i }).click()

    await expect(page.getByTestId('game-shell')).toBeVisible()

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await expect(page.getByTestId('game-finished-status')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('game-finished-status')).toContainText(/abortada por anti-cheat/i)
    await expect(page.getByTestId('anti-cheat-incidents')).toContainText(/1/)

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    })
  })
})
