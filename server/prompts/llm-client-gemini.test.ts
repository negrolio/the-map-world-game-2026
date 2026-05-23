import { describe, expect, it, vi } from 'vitest'

import { createLlmClientGemini } from './llm-client-gemini.js'

function makeGeminiResponseBody(items: ReadonlyArray<Record<string, unknown>>): unknown {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({ items }),
            },
          ],
        },
      },
    ],
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createLlmClientGemini — config edge cases', () => {
  it('returns LLM_UNAVAILABLE when no API key is provided', async () => {
    const client = createLlmClientGemini({ apiKey: '' })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result).toEqual({ ok: false, code: 'LLM_UNAVAILABLE' })
  })
})

describe('createLlmClientGemini — success parsing', () => {
  it('parses Gemini structured response into LlmGenerateOutput', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        makeGeminiResponseBody([
          {
            iso2: 'AR',
            tag: 'historia',
            riddle:
              '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
            expected_iso2: 'AR',
            justification: 'Congreso de Tucumán',
            claimed_source_title: 'Congreso de Tucumán',
            claimed_source_locale: 'es',
            difficulty: 'medium',
            valid: true,
          },
        ]),
      ),
    )
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toHaveLength(1)
      const first = result.data.items[0]
      expect(first.kind).toBe('ok')
      if (first.kind === 'ok') {
        expect(first.iso2).toBe('AR')
        expect(first.expectedIso2).toBe('AR')
        expect(first.difficulty).toBe('medium')
      }
    }
  })

  it('recognises the insufficient_grounding sentinel', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        makeGeminiResponseBody([
          { iso2: 'YE', tag: 'cine', error: 'insufficient_grounding' },
        ]),
      ),
    )
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'YE', tag: 'cine' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items[0].kind).toBe('insufficient_grounding')
    }
  })

  it('parses camelCase field names from the model JSON', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        makeGeminiResponseBody([
          {
            iso2: 'AR',
            tag: 'historia',
            riddle:
              '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
            expectedIso2: 'AR',
            claimedSourceTitle: 'Congreso de Tucumán',
            claimedSourceLocale: 'es',
            difficulty: 'medium',
            valid: true,
          },
        ]),
      ),
    )
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result.ok).toBe(true)
  })

  it('sends responseSchema in the Gemini request body', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        makeGeminiResponseBody([
          {
            iso2: 'AR',
            tag: 'historia',
            riddle:
              '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
            expected_iso2: 'AR',
            claimed_source_title: 'Congreso de Tucumán',
            claimed_source_locale: 'es',
            difficulty: 'medium',
            valid: true,
          },
        ]),
      ),
    )
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)) as {
      generationConfig?: { responseSchema?: unknown }
    }
    expect(body.generationConfig?.responseSchema).toBeDefined()
  })

  it('strips markdown code fences from the model text before JSON.parse', async () => {
    const fetchImpl = vi.fn(async () => {
      const text =
        '```json\n' +
        JSON.stringify({
          items: [
            {
              iso2: 'AR',
              tag: 'historia',
              riddle:
                '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
              expected_iso2: 'AR',
              justification: '',
              claimed_source_title: 'Congreso de Tucumán',
              claimed_source_locale: 'es',
              difficulty: 'medium',
              valid: true,
            },
          ],
        }) +
        '\n```'
      return jsonResponse({
        candidates: [{ content: { parts: [{ text }] } }],
      })
    })
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result.ok).toBe(true)
  })
})

describe('createLlmClientGemini — failure paths', () => {
  it('returns LLM_RATE_LIMITED on HTTP 429 (no retry)', async () => {
    const fetchImpl = vi.fn(async () => new Response('rate', { status: 429 }))
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result).toEqual({ ok: false, code: 'LLM_RATE_LIMITED' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns LLM_UNAVAILABLE on HTTP 500 after one retry', async () => {
    const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }))
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result).toEqual({ ok: false, code: 'LLM_UNAVAILABLE' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('returns LLM_UNAVAILABLE when the body is malformed JSON', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response('not json', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
    )
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result).toEqual({ ok: false, code: 'LLM_UNAVAILABLE' })
  })

  it('returns LLM_UNAVAILABLE on network abort', async () => {
    const fetchImpl = vi.fn(
      async (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('abort')))
        }),
    )
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 5,
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result).toEqual({ ok: false, code: 'LLM_UNAVAILABLE' })
  })
})

describe('createLlmClientGemini — onBatchDebug callback', () => {
  it('forwards system/user prompt, raw response, parsed items and usage tokens', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      items: [
                        {
                          iso2: 'AR',
                          tag: 'historia',
                          riddle:
                            '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
                          expected_iso2: 'AR',
                          claimed_source_title: 'Congreso de Tucumán',
                          claimed_source_locale: 'es',
                          difficulty: 'medium',
                          valid: true,
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 512,
            candidatesTokenCount: 890,
            totalTokenCount: 1402,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const onBatchDebug = vi.fn()
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
      onBatchDebug,
    })

    expect(result.ok).toBe(true)
    expect(onBatchDebug).toHaveBeenCalledTimes(1)
    const debug = onBatchDebug.mock.calls[0]?.[0]
    expect(debug.systemInstruction).toContain('adivinanzas')
    expect(debug.userInstruction.length).toBeGreaterThan(0)
    expect(debug.usage).toEqual({
      promptTokens: 512,
      completionTokens: 890,
      totalTokens: 1402,
    })
    expect(debug.parsedItems).toHaveLength(1)
    expect(debug.failure).toBeUndefined()
  })

  it('emits the callback with a failure code on rate limit', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    const client = createLlmClientGemini({
      apiKey: 'fake',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const onBatchDebug = vi.fn()
    await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
      onBatchDebug,
    })

    expect(onBatchDebug).toHaveBeenCalledTimes(1)
    const debug = onBatchDebug.mock.calls[0]?.[0]
    expect(debug.failure).toBe('LLM_RATE_LIMITED')
    expect(debug.usage).toBeUndefined()
  })
})
