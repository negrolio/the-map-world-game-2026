import { expect, test } from '@playwright/test'

import {
  goToLearnMode,
  goToSetup,
  mockLearnApi,
} from './helpers'

test.describe('Modo aprendizaje — flujo e2e (API mock)', () => {
  test('Home → mapa → ficha → cerrar → segundo país', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockLearnApi(page)
    await goToLearnMode(page)

    await expect(page.locator('path[data-iso]')).not.toHaveCount(0, { timeout: 45_000 })

    const argentina = page.locator('path[data-iso="AR"]').first()
    await expect(argentina).toBeVisible({ timeout: 20_000 })
    await argentina.click({ force: true })

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('E2E AR')).toBeVisible()
    await expect(page.getByTestId('world-map-root')).toHaveAttribute(
      'data-map-interaction-locked',
      'true',
    )

    await page.getByTestId('country-learn-modal-close').click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('world-map-root')).not.toHaveAttribute(
      'data-map-interaction-locked',
      'true',
    )

    const germany = page.locator('path[data-iso="DE"]').first()
    await expect(germany).toBeVisible({ timeout: 20_000 })
    await germany.click({ force: true })

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('E2E DE')).toBeVisible()
  })

  test('navegación Setup desde overlay del mapa de aprendizaje', async ({ page }) => {
    await mockLearnApi(page)
    await goToLearnMode(page)

    await page.getByRole('button', { name: /Setup/i }).click()
    await expect(page.getByRole('heading', { name: /Panel de configuración|Game Setup Panel/i })).toBeVisible()
    await expect(page.getByTestId('learn-map-view')).toHaveCount(0)
  })
})

test.describe('Regresión quiz tras locale en Home', () => {
  test('goToSetup selecciona idioma en Home antes del panel', async ({ page }) => {
    await goToSetup(page)
    await expect(page.locator('#app-locale')).toHaveValue('es')
    await expect(page.getByRole('heading', { name: /Panel de configuración|Game Setup Panel/i })).toBeVisible()
  })
})
