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
  await page.getByRole('button', { name: /Comenzar setup|Start setup/i }).click()
}

export async function goToLearnMode(page: Page): Promise<void> {
  await goToHome(page)
  await selectAppLocale(page, 'es')
  await page.getByRole('button', { name: /Modo aprendizaje|Learning mode/i }).click()
  await expect(page.getByTestId('learn-map-view')).toBeVisible()
}

export function buildMockLearnProfile(iso2: string) {
  return {
    iso2: iso2.toUpperCase(),
    locale: 'es',
    title: `E2E ${iso2.toUpperCase()}`,
    summary: 'Resumen de prueba para Playwright.',
    flagUrl: null,
    wikipediaUrl: `https://es.wikipedia.org/wiki/${iso2.toUpperCase()}`,
    source: 'wikipedia',
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
