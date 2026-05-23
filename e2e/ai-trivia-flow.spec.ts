import { expect, test, type Page } from '@playwright/test'

import { goToSetup } from './helpers'

interface MockPromptItem {
  readonly iso2: string
  readonly tag: string
  readonly riddle: string
  readonly difficulty: 'easy' | 'medium' | 'hard'
  readonly source: {
    readonly title: string
    readonly locale: 'es' | 'en'
    readonly url: string
  }
}

const SAMPLE_ITEMS: readonly MockPromptItem[] = [
  {
    iso2: 'AR',
    tag: 'historia',
    riddle:
      '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico al sur del continente?',
    difficulty: 'medium',
    source: {
      title: 'Congreso de Tucumán',
      locale: 'es',
      url: 'https://es.wikipedia.org/wiki/Congreso_de_Tucum%C3%A1n',
    },
  },
  {
    iso2: 'BR',
    tag: 'historia',
    riddle:
      'Hubo aquí un emperador europeo en el siglo XIX y una larga dinastía cuyo símbolo nacional es verde y amarillo.',
    difficulty: 'medium',
    source: {
      title: 'Imperio del Brasil',
      locale: 'es',
      url: 'https://es.wikipedia.org/wiki/Imperio_del_Brasil',
    },
  },
  {
    iso2: 'CL',
    tag: 'historia',
    riddle:
      'Largo y angosto, este territorio sudamericano celebra su independencia en septiembre y limita con el Pacífico.',
    difficulty: 'medium',
    source: {
      title: 'Historia de Chile',
      locale: 'es',
      url: 'https://es.wikipedia.org/wiki/Historia_de_Chile',
    },
  },
]

async function mockPromptsApi(
  page: Page,
  items: readonly MockPromptItem[] = SAMPLE_ITEMS,
): Promise<void> {
  await page.route('**/api/v1/prompts/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items }),
    })
  })
}

async function mockPromptsApiFailure(page: Page, code: string, status: number): Promise<void> {
  await page.route('**/api/v1/prompts/generate', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code, message: code } }),
    })
  })
}

test.describe('AI trivia mode — happy path', () => {
  test('flow completo: setup AI → loading → game con AI prompt → acierto → final', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockPromptsApi(page)
    await goToSetup(page)

    await page.getByRole('radio', { name: /IA Trivia|AI Trivia/i }).check()

    await page.locator('#question-count').fill('3')

    await page.getByRole('button', { name: /Iniciar partida|Start game/i }).click()

    await expect(page.getByText(/Preparando la partida AI|Preparing the AI game/i)).toBeVisible({
      timeout: 5000,
    })

    await expect(page.getByTestId('game-shell')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('round-prompt')).toBeVisible()
    await expect(page.getByTestId('ai-attempts-banner')).toBeVisible()
    await expect(page.getByTestId('ai-source-link')).toBeVisible()

    await expect(page.locator('path[data-iso]')).not.toHaveCount(0, { timeout: 45_000 })

    for (let i = 0; i < 3; i += 1) {
      const iso2 = await page.getByTestId('round-prompt').getAttribute('data-target-iso2')
      expect(iso2).toBeTruthy()
      const target = page.locator(`path[data-iso="${iso2}"]`).first()
      await expect(target).toBeVisible({ timeout: 20_000 })
      await target.scrollIntoViewIfNeeded()
      let answered = false
      for (let attempt = 0; attempt < 3 && !answered; attempt += 1) {
        await target.click({ force: true })
        try {
          await expect(page.getByTestId('guess-feedback')).toBeVisible({ timeout: 5000 })
          answered = true
        } catch {
          /* try again */
        }
      }
      expect(answered).toBe(true)
      await page.getByTestId('advance-round-button').click()
    }

    await expect(page.getByTestId('game-finished-status')).toBeVisible({ timeout: 20_000 })
  })
})

test.describe('AI trivia mode — error paths', () => {
  test('error 503 INSUFFICIENT_GROUNDING_BATCH → muestra mensaje y permite reintentar', async ({ page }) => {
    await mockPromptsApiFailure(page, 'INSUFFICIENT_GROUNDING_BATCH', 503)
    await goToSetup(page)
    await page.getByRole('radio', { name: /IA Trivia|AI Trivia/i }).check()
    await page.locator('#question-count').fill('3')
    await page.getByRole('button', { name: /Iniciar partida|Start game/i }).click()

    const errorMessage = page.getByTestId('ai-prompts-error-message')
    await expect(errorMessage).toBeVisible({ timeout: 20_000 })
    await expect(errorMessage).toContainText(
      /No se pudieron generar adivinanzas|We could not generate verifiable riddles/i,
    )
  })

  test('error 429 LLM_RATE_LIMITED → mensaje específico de rate limit', async ({ page }) => {
    await mockPromptsApiFailure(page, 'LLM_RATE_LIMITED', 429)
    await goToSetup(page)
    await page.getByRole('radio', { name: /IA Trivia|AI Trivia/i }).check()
    await page.locator('#question-count').fill('3')
    await page.getByRole('button', { name: /Iniciar partida|Start game/i }).click()

    const errorMessage = page.getByTestId('ai-prompts-error-message')
    await expect(errorMessage).toBeVisible({ timeout: 20_000 })
    await expect(errorMessage).toContainText(/demasiadas solicitudes|too many requests/i)
  })
})
