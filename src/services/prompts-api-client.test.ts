import { describe, expect, it, vi } from 'vitest'

import {
  buildPromptsGenerateUrl,
  fetchAiPrompts,
  resolvePromptsApiBaseUrl,
} from './prompts-api-client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function withBase(url: string, fn: () => Promise<void> | void): Promise<void> {
  const original = import.meta.env.VITE_API_BASE_URL
  const env = import.meta.env as unknown as Record<string, string | undefined>
  env.VITE_API_BASE_URL = url
  const restore = () => {
    if (original === undefined) {
      delete env.VITE_API_BASE_URL
    } else {
      env.VITE_API_BASE_URL = original
    }
  }
  const result = fn()
  if (result instanceof Promise) {
    return result.finally(restore)
  }
  restore()
  return Promise.resolve()
}

describe('resolvePromptsApiBaseUrl', () => {
  it('strips trailing slash', async () => {
    await withBase('http://localhost:3000/', () => {
      expect(resolvePromptsApiBaseUrl()).toBe('http://localhost:3000')
    })
  })

  it('returns empty string when not configured', async () => {
    await withBase('', () => {
      expect(resolvePromptsApiBaseUrl()).toBe('')
    })
  })
})

describe('buildPromptsGenerateUrl', () => {
  it('appends /api/v1/prompts/generate', () => {
    expect(buildPromptsGenerateUrl('http://x:3000')).toBe('http://x:3000/api/v1/prompts/generate')
  })
})

describe('fetchAiPrompts', () => {
  const validPayload = {
    items: [
      {
        riddleId: 'k73abc',
        iso2: 'AR',
        tag: 'historia',
        riddle:
          '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
        difficulty: 'medium',
        source: {
          title: 'Congreso de Tucumán',
          locale: 'es',
          url: 'https://es.wikipedia.org/wiki/Congreso_de_Tucum%C3%A1n',
        },
      },
    ],
  }

  it('returns INTERNAL_ERROR when base URL is missing', async () => {
    await withBase('', async () => {
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: vi.fn() as unknown as typeof fetch,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INTERNAL_ERROR')
      }
    })
  })

  it('returns parsed data on 200 OK with valid payload (including riddleId)', async () => {
    await withBase('http://localhost:3000', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(validPayload))
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.items).toHaveLength(1)
        expect(result.data.items[0].iso2).toBe('AR')
        expect(result.data.items[0].riddleId).toBe('k73abc')
      }
    })
  })

  it('sends excludedIds in the request body when provided', async () => {
    await withBase('http://localhost:3000', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(validPayload))
      await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        excludedIds: ['k73abc', 'k73def'],
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      const init = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
        | RequestInit
        | undefined
      expect(init?.body).toBeTruthy()
      const sent = JSON.parse(init?.body as string) as { excludedIds?: string[] }
      expect(sent.excludedIds).toEqual(['k73abc', 'k73def'])
    })
  })

  it('omits excludedIds from the body when array is empty', async () => {
    await withBase('http://localhost:3000', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(validPayload))
      await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        excludedIds: [],
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      const init = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
        | RequestInit
        | undefined
      const sent = JSON.parse(init?.body as string) as Record<string, unknown>
      expect(sent).not.toHaveProperty('excludedIds')
    })
  })

  it('rejects items missing riddleId (defensive parsing)', async () => {
    await withBase('http://localhost:3000', async () => {
      const payload = {
        items: [
          {
            iso2: 'AR',
            tag: 'historia',
            riddle:
              '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
            difficulty: 'medium',
            source: {
              title: 'Congreso de Tucumán',
              locale: 'es',
              url: 'https://es.wikipedia.org/wiki/Congreso_de_Tucum%C3%A1n',
            },
          },
        ],
      }
      const fetchImpl = vi.fn(async () => jsonResponse(payload))
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INTERNAL_ERROR')
      }
    })
  })

  it('drops items with invalid shape (defensive parsing)', async () => {
    await withBase('http://localhost:3000', async () => {
      const payload = {
        items: [
          ...validPayload.items,
          {
            riddleId: 'k73br',
            iso2: 'BR',
            tag: 'historia',
            riddle: 'short',
            difficulty: 'extreme',
            source: { title: 'X', locale: 'es', url: 'https://es.wikipedia.org/wiki/X' },
          },
          {
            riddleId: 'k73cl',
            iso2: 'CL',
            tag: 'unknown-tag',
            riddle: 'whatever',
            difficulty: 'easy',
            source: { title: 'Y', locale: 'es', url: 'https://es.wikipedia.org/wiki/Y' },
          },
        ],
      }
      const fetchImpl = vi.fn(async () => jsonResponse(payload))
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.items).toHaveLength(1)
      }
    })
  })

  it('returns null parse when every item fails validation (triggers INTERNAL_ERROR)', async () => {
    await withBase('http://localhost:3000', async () => {
      const payload = {
        items: [
          {
            riddleId: 'k73x',
            iso2: 'AR',
            tag: 'historia',
            riddle: 'x',
            difficulty: 'medium',
            source: { title: 'X', locale: 'es', url: 'https://evil.example/X' },
          },
        ],
      }
      const fetchImpl = vi.fn(async () => jsonResponse(payload))
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INTERNAL_ERROR')
      }
    })
  })

  it('accepts http wikipedia URLs and normalizes them to https', async () => {
    await withBase('http://localhost:3000', async () => {
      const payload = {
        items: [
          {
            riddleId: 'k73http',
            iso2: 'AR',
            tag: 'historia',
            riddle:
              '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
            difficulty: 'medium',
            source: {
              title: 'Congreso de Tucumán',
              locale: 'es',
              url: 'http://es.wikipedia.org/wiki/Congreso_de_Tucuman',
            },
          },
        ],
      }
      const fetchImpl = vi.fn(async () => jsonResponse(payload))
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.items[0].source.url).toMatch(/^https:\/\//)
      }
    })
  })

  it('parses upstream error code (e.g. INSUFFICIENT_GROUNDING_BATCH)', async () => {
    await withBase('http://localhost:3000', async () => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse(
          {
            error: { code: 'INSUFFICIENT_GROUNDING_BATCH', message: 'no items' },
          },
          503,
        ),
      )
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INSUFFICIENT_GROUNDING_BATCH')
      }
    })
  })

  it('returns INTERNAL_ERROR for unknown server error codes', async () => {
    await withBase('http://localhost:3000', async () => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse({ error: { code: 'WAT', message: 'wat' } }, 500),
      )
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INTERNAL_ERROR')
      }
    })
  })

  it('returns LLM_UNAVAILABLE on network failure', async () => {
    await withBase('http://localhost:3000', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new Error('network down')
      })
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('LLM_UNAVAILABLE')
      }
    })
  })

  it('propagates AbortSignal as INTERNAL_ERROR with `Aborted` message', async () => {
    await withBase('http://localhost:3000', async () => {
      const controller = new AbortController()
      const fetchImpl = vi.fn(async (_url: unknown, init?: { signal?: AbortSignal }) => {
        if (init?.signal?.aborted) {
          const error = new Error('aborted')
          error.name = 'AbortError'
          throw error
        }
        return jsonResponse(validPayload)
      })
      controller.abort()
      const result = await fetchAiPrompts({
        items: [{ iso2: 'AR' }],
        tags: [],
        locale: 'es',
        signal: controller.signal,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe('INTERNAL_ERROR')
        expect(result.error.message).toBe('Aborted')
      }
    })
  })
})
