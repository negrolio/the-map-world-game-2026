import { describe, expect, it, vi } from 'vitest'

import type {
  LlmGenerateOutputItem,
  WikipediaGroundingClient,
  WikipediaGroundingResult,
} from './prompts-deps.js'
import { validateAiResponseItem } from './validate-ai-response.js'

function makeOkItem(
  overrides: Partial<Extract<LlmGenerateOutputItem, { kind: 'ok' }>> = {},
): Extract<LlmGenerateOutputItem, { kind: 'ok' }> {
  return {
    kind: 'ok',
    iso2: 'AR',
    tag: 'historia',
    riddle: '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
    expectedIso2: 'AR',
    justification: 'Congreso de Tucumán, 1816.',
    claimedSourceTitle: 'Congreso de Tucumán',
    claimedSourceLocale: 'es',
    difficulty: 'medium',
    valid: true,
    ...overrides,
  }
}

function makeGroundingClient(
  result: WikipediaGroundingResult = { ok: true, exists: true, mentionsCountry: true },
): WikipediaGroundingClient {
  return {
    checkGrounding: vi.fn(async () => result),
  }
}

function makeDeps(grounding?: WikipediaGroundingResult) {
  return {
    groundingClient: makeGroundingClient(grounding),
    groundingMemo: new Map<string, WikipediaGroundingResult>(),
  }
}

describe('validateAiResponseItem — happy path', () => {
  it('accepts a well-formed item that satisfies every rule', async () => {
    const item = makeOkItem({
      riddle:
        'Aquí gobernó una larga dinastía y se redactó una constitución pionera durante el siglo XIX.',
      expectedIso2: 'BR',
      claimedSourceTitle: 'Imperio del Brasil',
    })
    const result = await validateAiResponseItem(
      { requestIso2: 'BR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: true })
  })
})

describe('V1 (ISO echo)', () => {
  it('rejects when expectedIso2 does not match requestIso2', async () => {
    const item = makeOkItem({ expectedIso2: 'BR' })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: false, rule: 'V1_ISO_MISMATCH' })
  })

  it('is case-insensitive for iso2 comparison', async () => {
    const item = makeOkItem({
      expectedIso2: 'br',
      riddle: 'Aquí gobernó una larga dinastía durante el siglo XIX y un emperador europeo nació.',
      claimedSourceTitle: 'Imperio del Brasil',
    })
    const result = await validateAiResponseItem(
      { requestIso2: 'BR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: true })
  })
})

describe('V8 (difficulty enum)', () => {
  it('rejects unknown difficulty values', async () => {
    const item = makeOkItem({ difficulty: 'extreme' as never })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: false, rule: 'V8_BAD_DIFFICULTY' })
  })
})

describe('V7 (self-check)', () => {
  it('rejects when model marked itself invalid', async () => {
    const item = makeOkItem({ valid: false })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: false, rule: 'V7_SELF_INVALID' })
  })
})

describe('V3 (length)', () => {
  it('rejects riddles shorter than 20 characters', async () => {
    const item = makeOkItem({ riddle: 'Muy corto.' })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: false, rule: 'V3_LENGTH' })
  })

  it('rejects riddles longer than 280 characters', async () => {
    const item = makeOkItem({ riddle: 'a'.repeat(281) })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: false, rule: 'V3_LENGTH' })
  })
})

describe('V4 (language)', () => {
  it('rejects a Spanish-locale riddle written in English', async () => {
    const item = makeOkItem({
      riddle: 'The kingdom that ruled the seas and signed a peace treaty in 1648 with neighbors.',
    })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      makeDeps(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.rule).toBe('V4_LANGUAGE')
    }
  })

  it('rejects an English-locale riddle written in Spanish (accents)', async () => {
    const item = makeOkItem({
      riddle: 'Aquí gobernó una larga dinastía durante el siglo XIX y nació un emperador europeo.',
      claimedSourceLocale: 'en',
      claimedSourceTitle: 'Empire of Brazil',
    })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'en', item },
      makeDeps(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.rule).toBe('V4_LANGUAGE')
    }
  })
})

describe('V2 (forbidden terms)', () => {
  it('rejects when the riddle leaks the country name', async () => {
    const item = makeOkItem({
      riddle:
        'Argentina celebró su independencia en 1816 en un evento histórico documentado en archivos.',
    })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: false, rule: 'V2_FORBIDDEN_TERM' })
  })

  it('rejects when the riddle leaks the capital name', async () => {
    const item = makeOkItem({
      riddle:
        'En el siglo XIX, una declaración trascendental tuvo lugar en Buenos Aires según los archivos.',
    })
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      makeDeps(),
    )
    expect(result).toEqual({ ok: false, rule: 'V2_FORBIDDEN_TERM' })
  })
})

describe('V5 / V6 (Wikipedia grounding via injected client)', () => {
  it('rejects when the article does not exist', async () => {
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item: makeOkItem() },
      makeDeps({ ok: true, exists: false }),
    )
    expect(result).toEqual({ ok: false, rule: 'V5_ARTICLE_MISSING' })
  })

  it('rejects when the article does not mention the country', async () => {
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item: makeOkItem() },
      makeDeps({ ok: true, exists: true, mentionsCountry: false }),
    )
    expect(result).toEqual({ ok: false, rule: 'V6_COUNTRY_NOT_MENTIONED' })
  })

  it('propagates WIKIPEDIA_UNAVAILABLE when grounding client fails', async () => {
    const result = await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item: makeOkItem() },
      makeDeps({ ok: false, code: 'WIKIPEDIA_UNAVAILABLE' }),
    )
    expect(result).toEqual({ ok: false, rule: 'WIKIPEDIA_UNAVAILABLE' })
  })

  it('memoizes grounding checks by (title, locale, iso2)', async () => {
    const client = makeGroundingClient()
    const memo = new Map<string, WikipediaGroundingResult>()
    const item = makeOkItem()
    await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      { groundingClient: client, groundingMemo: memo },
    )
    await validateAiResponseItem(
      { requestIso2: 'AR', locale: 'es', item },
      { groundingClient: client, groundingMemo: memo },
    )
    expect(client.checkGrounding).toHaveBeenCalledTimes(1)
  })
})
