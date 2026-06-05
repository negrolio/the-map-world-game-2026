import { expect, test, type Page } from '@playwright/test'

import { clickMapCountry, clickMapCountryForCorrectGuess, clickStartGame, goToSetup, selectSetupMode } from './helpers'

interface MockPromptItem {
  readonly riddleId: string
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
    riddleId: 'k73ar1',
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
    riddleId: 'k73br1',
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
    riddleId: 'k73cl1',
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

function buildMockItemForIso2(iso2: string, index: number): MockPromptItem {
  const upper = iso2.toUpperCase()
  const template =
    SAMPLE_ITEMS.find((item) => item.iso2 === upper) ??
    ({
      riddleId: `e2e-${upper}`,
      iso2: upper,
      tag: 'historia',
      riddle: `Adivinanza E2E para ${upper}.`,
      difficulty: 'medium',
      source: {
        title: `Artículo ${upper}`,
        locale: 'es',
        url: `https://es.wikipedia.org/wiki/${upper}`,
      },
    } satisfies MockPromptItem)
  return {
    ...template,
    iso2: upper,
    riddleId: `${template.riddleId}-req-${String(index)}`,
  }
}

/**
 * Mock alineado al contrato real: el cliente pide ISO2 del pool candidato y solo
 * conserva items cuyo `iso2` está en ese set (`mapAiItemsToPool`). Devolver
 * AR/BR/CL fijos rompe cuando el pool sortea otros países.
 */
async function mockPromptsApi(
  page: Page,
  items?: readonly MockPromptItem[],
): Promise<void> {
  await page.route('**/api/v1/prompts/generate', async (route) => {
    if (items && items.length > 0) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items }),
      })
      return
    }
    const postData = route.request().postData()
    const parsed = postData
      ? (JSON.parse(postData) as { items?: ReadonlyArray<{ readonly iso2: string }> })
      : {}
    const requested = parsed.items ?? []
    const responseItems = requested.map((entry, index) => buildMockItemForIso2(entry.iso2, index))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: responseItems }),
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

/** default + hover de `MAP_WRONG_SELECTION_PALETTE` (el clic deja el path en hover). */
const FILL_WRONG_FULL = ['rgb(217, 76, 56)', 'rgb(181, 56, 36)'] as const
const FILL_WRONG_DIMMED = ['rgba(217, 76, 56, 0.5)', 'rgba(181, 56, 36, 0.5)'] as const
const FILL_CORRECT_TARGET = ['rgb(124, 179, 66)', 'rgb(94, 140, 45)'] as const

const COUNTRY_NAME_ES: Readonly<Record<string, string>> = {
  AR: 'Argentina',
  BR: 'Brasil',
  CL: 'Chile',
  JP: 'Japón',
  UY: 'Uruguay',
  US: 'Estados Unidos',
  CA: 'Canadá',
  DE: 'Alemania',
}

/** Países grandes y habituales en el topo 110m para clics e2e fiables. */
const WRONG_CLICK_POOL = ['AR', 'BR', 'CL', 'JP', 'UY', 'US', 'CA', 'DE'] as const

const AI_FIXED_QUESTION_COUNT = 5

async function startAiGame(
  page: Page,
  options?: { readonly items?: readonly MockPromptItem[] },
): Promise<void> {
  if (options?.items) {
    await mockPromptsApi(page, options.items)
  } else {
    await mockPromptsApi(page)
  }
  await goToSetup(page)
  await selectSetupMode(page, 'ai')
  await clickStartGame(page)
  // Con API mockeada el loading puede ser tan breve que no alcance a pintarse.
  await expect(page.getByTestId('game-shell')).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('path[data-iso]')).not.toHaveCount(0, { timeout: 45_000 })
}

async function expectPathFill(
  page: Page,
  iso2: string,
  allowedFills: readonly string[],
): Promise<void> {
  const path = page.locator(`path[data-iso="${iso2}"]`).first()
  await page.mouse.move(0, 0)
  await expect
    .poll(async () => {
      const fill = await path.evaluate((element) => getComputedStyle(element).fill)
      return allowedFills.includes(fill)
    })
    .toBe(true)
}

test.describe('AI trivia mode — happy path', () => {
  test('flow completo: setup AI → loading → game con AI prompt → acierto → final', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockPromptsApi(page)
    await goToSetup(page)

    await selectSetupMode(page, 'ai')

    await clickStartGame(page)

    await expect(page.getByTestId('game-shell')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('round-prompt')).toBeVisible()
    await expect(page.getByTestId('ai-attempts-banner')).toBeVisible()
    await expect(page.getByTestId('ai-source-link')).toHaveCount(0)

    await expect(page.locator('path[data-iso]')).not.toHaveCount(0, { timeout: 45_000 })

    for (let i = 0; i < AI_FIXED_QUESTION_COUNT; i += 1) {
      const iso2 = await page.getByTestId('round-prompt').getAttribute('data-target-iso2')
      expect(iso2).toBeTruthy()
      await clickMapCountryForCorrectGuess(page, iso2!)
      await page.getByTestId('advance-round-button').click()
    }

    await expect(page.getByTestId('game-finished-status')).toBeVisible({ timeout: 20_000 })
  })
})

test.describe('AI trivia mode — dedupe via excludedIds', () => {
  test('a second AI request sends excludedIds with the riddleIds from the first response', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    const requests: { excludedIds?: string[] }[] = []
    let callCount = 0
    await page.route('**/api/v1/prompts/generate', async (route) => {
      callCount += 1
      const postData = route.request().postData()
      const parsed = postData ? (JSON.parse(postData) as { excludedIds?: string[] }) : {}
      requests.push({ excludedIds: parsed.excludedIds })

      const requested = parsed.items ?? []
      const items = requested.map((entry, index) => ({
        ...buildMockItemForIso2(entry.iso2, index),
        riddleId: `${buildMockItemForIso2(entry.iso2, index).riddleId}-call-${String(callCount)}`,
      }))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items }),
      })
    })

    await goToSetup(page)
    await selectSetupMode(page, 'ai')
    await clickStartGame(page)
    await expect(page.getByTestId('game-shell')).toBeVisible({ timeout: 20_000 })

    expect(callCount).toBeGreaterThanOrEqual(1)
    expect(requests[0].excludedIds ?? []).toEqual([])

    await page.goto('/')
    await goToSetup(page)
    await selectSetupMode(page, 'ai')
    await clickStartGame(page)
    await expect(page.getByTestId('game-shell')).toBeVisible({ timeout: 20_000 })

    expect(callCount).toBeGreaterThanOrEqual(2)
    const secondCallExcluded = requests[1].excludedIds ?? []
    expect(secondCallExcluded.length).toBeGreaterThan(0)
    expect(secondCallExcluded).toEqual(
      expect.arrayContaining([
        expect.stringContaining('call-1'),
      ]),
    )
  })
})

test.describe('AI trivia mode — UX feedback (F1–F5)', () => {
  test('2 fallos + acierto en intento 3: copy, link gating, highlight y resumen final', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await startAiGame(page)

    const targetIso2 = await page.getByTestId('round-prompt').getAttribute('data-target-iso2')
    expect(targetIso2).toBeTruthy()
    const targetName = COUNTRY_NAME_ES[targetIso2!] ?? targetIso2!

    const wrongIso2List = WRONG_CLICK_POOL.filter((iso2) => iso2 !== targetIso2).slice(0, 2)
    expect(wrongIso2List).toHaveLength(2)

    await expect(page.getByTestId('ai-source-link')).toHaveCount(0)

    await clickMapCountry(page, wrongIso2List[0]!)
    const wrongName1 = COUNTRY_NAME_ES[wrongIso2List[0]!] ?? wrongIso2List[0]!
    const attemptFeedback1 = page.getByTestId('ai-attempt-feedback')
    await expect(attemptFeedback1).toBeVisible({ timeout: 5000 })
    await expect(attemptFeedback1).toContainText(/Mal!/i)
    await expect(attemptFeedback1).toContainText(wrongName1)
    await expect(attemptFeedback1).toContainText(/2 intento/i)
    await expect(page.getByTestId('ai-source-link')).toHaveCount(0)
    await expectPathFill(page, wrongIso2List[0]!, FILL_WRONG_FULL)

    await clickMapCountry(page, wrongIso2List[1]!)
    const wrongName2 = COUNTRY_NAME_ES[wrongIso2List[1]!] ?? wrongIso2List[1]!
    const attemptFeedback2 = page.getByTestId('ai-attempt-feedback')
    await expect(attemptFeedback2).toBeVisible({ timeout: 5000 })
    await expect(attemptFeedback2).toContainText(/Mal!/i)
    await expect(attemptFeedback2).toContainText(wrongName2)
    await expect(attemptFeedback2).toContainText(/1 intento/i)
    await expect(page.getByTestId('ai-source-link')).toHaveCount(0)
    await expectPathFill(page, wrongIso2List[0]!, FILL_WRONG_FULL)
    await expectPathFill(page, wrongIso2List[1]!, FILL_WRONG_FULL)

    await clickMapCountryForCorrectGuess(page, targetIso2!)
    const guessFeedback = page.getByTestId('guess-feedback')
    await expect(guessFeedback).toContainText(/Bien!/i)
    await expect(guessFeedback).toContainText(/objetivo era/i)
    await expect(guessFeedback).toContainText(targetName)
    await expect(guessFeedback.getByTestId('ai-source-link')).toBeVisible()
    await expectPathFill(page, targetIso2!, FILL_CORRECT_TARGET)
    await expectPathFill(page, wrongIso2List[0]!, FILL_WRONG_DIMMED)
    await expectPathFill(page, wrongIso2List[1]!, FILL_WRONG_DIMMED)

    await page.getByTestId('advance-round-button').click()

    for (let round = 1; round < AI_FIXED_QUESTION_COUNT; round += 1) {
      const iso2 = await page.getByTestId('round-prompt').getAttribute('data-target-iso2')
      expect(iso2).toBeTruthy()
      await clickMapCountryForCorrectGuess(page, iso2!)
      await page.getByTestId('advance-round-button').click()
    }

    await expect(page.getByTestId('game-finished-status')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('ai-rounds-summary')).toBeVisible()
    await expect(page.getByText(/Acertaste en intento 3/i)).toBeVisible()
    await expect(page.getByText(/\+0\.25 pts/i)).toBeVisible()
  })
})

test.describe('AI trivia mode — anti-cheat pausado entre rondas (F3)', () => {
  test('blur con ronda cerrada no aborta; blur con ronda abierta sí aborta en strict', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await startAiGame(page)

    const targetIso2 = await page.getByTestId('round-prompt').getAttribute('data-target-iso2')
    expect(targetIso2).toBeTruthy()
    await clickMapCountryForCorrectGuess(page, targetIso2!)
    await expect(page.getByTestId('advance-round-button')).toBeVisible()

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
    })
    await expect(page.getByTestId('game-shell')).toBeVisible()
    await expect(page.getByTestId('game-finished-status')).toHaveCount(0)

    await page.getByTestId('advance-round-button').click()
    await expect(page.getByTestId('round-prompt')).toBeVisible({ timeout: 10_000 })

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
    })
    await expect(page.getByTestId('game-finished-status')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('game-finished-status')).toContainText(/abortada por anti-cheat/i)
    await expect(page.getByTestId('anti-cheat-incidents')).toContainText(/1/)
  })
})

test.describe('AI trivia mode — error paths', () => {
  test('error 503 INSUFFICIENT_GROUNDING_BATCH → muestra mensaje y permite reintentar', async ({ page }) => {
    await mockPromptsApiFailure(page, 'INSUFFICIENT_GROUNDING_BATCH', 503)
    await goToSetup(page)
    await selectSetupMode(page, 'ai')
    await clickStartGame(page)

    const errorMessage = page.getByTestId('ai-prompts-error-message')
    await expect(errorMessage).toBeVisible({ timeout: 20_000 })
    await expect(errorMessage).toContainText(
      /No se pudieron generar adivinanzas|We could not generate verifiable riddles/i,
    )
  })

  test('error 429 LLM_RATE_LIMITED → mensaje específico de rate limit', async ({ page }) => {
    await mockPromptsApiFailure(page, 'LLM_RATE_LIMITED', 429)
    await goToSetup(page)
    await selectSetupMode(page, 'ai')
    await clickStartGame(page)

    const errorMessage = page.getByTestId('ai-prompts-error-message')
    await expect(errorMessage).toBeVisible({ timeout: 20_000 })
    await expect(errorMessage).toContainText(/demasiadas solicitudes|too many requests/i)
  })
})
