import { expect, test } from '@playwright/test'

test('muestra la home del MVP frontend', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'The Map World Game 2026' }),
  ).toBeVisible()
})

// MAP-UX-02 — Shell de partida pantalla completa con mapa edge-to-edge.
test('partida en pantalla completa: shell + overlay top/bottom + sin scroll de pagina', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  await page.getByRole('button', { name: /Comenzar setup/i }).click()
  await page.getByRole('button', { name: /Iniciar partida/i }).click()

  await expect(page.getByTestId('game-shell')).toBeVisible()
  await expect(page.getByTestId('game-overlay-top')).toBeVisible()
  await expect(page.getByTestId('game-overlay-bottom')).toBeVisible()
  await expect(page.getByTestId('world-map-root')).toHaveAttribute('data-fullbleed', 'true')

  // F2.1 — durante la partida, el documento no debe poder hacer scroll vertical.
  // `body.scrollHeight` debe ser igual al `clientHeight` del shell (overflow:hidden).
  const documentScrollDelta = await page.evaluate(() => {
    return document.documentElement.scrollHeight - document.documentElement.clientHeight
  })
  expect(documentScrollDelta).toBeLessThanOrEqual(1)

  // F2.8 — la línea debug "Último clic ISO2" no aparece en la vista de partida.
  await expect(page.getByTestId('map-click-feedback')).toHaveCount(0)
})
