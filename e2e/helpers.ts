import { expect, type Page } from '@playwright/test'

export type AppLocaleCode = 'es' | 'en'

export async function goToHome(page: Page): Promise<void> {
  await page.goto('/')
}

export async function selectAppLocale(page: Page, locale: AppLocaleCode = 'es'): Promise<void> {
  await page.waitForSelector('#app-locale')
  await page.selectOption('#app-locale', locale)
}

/** Home → locale ES → Setup (RF-L03: mismo locale global). */
export async function goToSetup(page: Page): Promise<void> {
  await goToHome(page)
  await selectAppLocale(page, 'es')
  await page.getByTestId('home-card-game').click()
}

export async function goToLearnMode(page: Page): Promise<void> {
  await goToHome(page)
  await selectAppLocale(page, 'es')
  await page.getByTestId('home-card-learn').click()
  await expect(page.getByTestId('learn-map-view')).toBeVisible()
}

export function buildMockLearnProfile(iso2: string) {
  const displayName = `E2E ${iso2.toUpperCase()}`
  return {
    iso2: iso2.toUpperCase(),
    locale: 'es',
    contentLocale: 'es',
    displayName,
    title: displayName,
    summary: 'Resumen de prueba para Playwright.',
    flagUrl: null,
    wikipediaUrl: `https://es.wikipedia.org/wiki/${iso2.toUpperCase()}`,
    source: 'wikipedia',
  }
}

/**
 * Clic en un país del topojson. Reintenta hasta ver feedback (acierto o intento
 * parcial en modo AI).
 */
export async function clickMapCountry(page: Page, iso2: string): Promise<void> {
  const target = page.locator(`path[data-iso="${iso2}"]`).first()
  await expect(target).toBeVisible({ timeout: 20_000 })
  await target.scrollIntoViewIfNeeded()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await target.click({ force: true })
    try {
      await expect(
        page.getByTestId('ai-attempt-feedback').or(page.getByTestId('guess-feedback')),
      ).toBeVisible({ timeout: 4000 })
      return
    } catch {
      if (attempt === 4) {
        throw new Error(`No hubo feedback tras clic en ${iso2}`)
      }
    }
  }
}

/** Reintenta el clic hasta cerrar la ronda (`guess-feedback`), útil en países chicos. */
export async function clickMapCountryForCorrectGuess(page: Page, iso2: string): Promise<void> {
  const target = page.locator(`path[data-iso="${iso2}"]`).first()
  await expect(target).toBeVisible({ timeout: 20_000 })
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await target.scrollIntoViewIfNeeded()
    await target.click({ force: true })
    try {
      await expect(page.getByTestId('guess-feedback')).toBeVisible({ timeout: 4000 })
      return
    } catch {
      if (attempt === 5) {
        throw new Error(`No hubo guess-feedback tras clic en ${iso2}`)
      }
    }
  }
}

export async function mockLearnApi(page: Page): Promise<void> {
  await page.route('**/api/v1/countries/*/learn**', async (route) => {
    const url = new URL(route.request().url())
    const match = url.pathname.match(/\/countries\/([^/]+)\/learn/i)
    const iso2 = match?.[1] ?? 'AR'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildMockLearnProfile(iso2)),
    })
  })
}
