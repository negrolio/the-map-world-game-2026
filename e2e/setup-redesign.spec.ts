import { expect, test } from '@playwright/test'

import { clickStartGame, goToSetup, openSetupOptions, selectSetupMode } from './helpers'

test.describe('Setup redesign — lobby y reglas AI', () => {
  test('path rápido: card País + CTA superior → mapa', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await goToSetup(page)

    await expect(page.getByTestId('setup-mode-country')).toBeVisible()
    await selectSetupMode(page, 'country')
    await clickStartGame(page)

    await expect(page.getByTestId('game-shell')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('world-map-root')).toBeVisible()
  })

  test('panel pergamino oculto hasta presionar Opciones', async ({ page }) => {
    await goToSetup(page)

    await expect(page.getByLabel(/Número de preguntas/i)).toHaveCount(0)

    await openSetupOptions(page)

    await expect(page.getByLabel(/Número de preguntas/i)).toBeVisible()
  })

  test('boton Opciones cambia su label al elegir AI', async ({ page }) => {
    await goToSetup(page)

    await expect(page.getByTestId('setup-options-toggle')).toHaveText(/^Opciones$/i)

    await selectSetupMode(page, 'ai')

    await expect(page.getByTestId('setup-options-toggle')).toHaveText(/Opciones \(elige tags\)/i)
  })

  test('AI clamp: 4 jugadores → card AI → 2 jugadores + aviso', async ({ page }) => {
    await goToSetup(page)
    await openSetupOptions(page)

    await page.locator('#player-count').selectOption('4')
    await expect(page.locator('#player-name-4')).toHaveValue(/Jugador 4|Player 4/)

    await selectSetupMode(page, 'ai')

    await expect(page.locator('#player-count')).toHaveValue('2')
    await expect(page.getByTestId('setup-notice')).toContainText(/máximo de 2 jugadores/i)
    await expect(page.getByLabel(/Cantidad de jugadores \(1–2\)/i)).toBeVisible()
  })

  test('modo AI oculta preguntas y anti-cheat', async ({ page }) => {
    await goToSetup(page)
    await selectSetupMode(page, 'ai')
    await openSetupOptions(page)

    await expect(page.getByText(/Tags temáticos/i)).toBeVisible()
    await expect(page.getByText(/Anti-cheat/i)).toHaveCount(0)
    await expect(page.getByLabel(/Número de preguntas/i)).toHaveCount(0)
  })
})
