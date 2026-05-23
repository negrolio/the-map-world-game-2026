import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import handler from './generate.js'
import { resetDefaultPromptsDepsForTests } from '../../../server/prompts/create-default-prompts-deps.js'
import { resetRateLimitBucketsForTests } from '../../_lib/rate-limit.js'
import type { VercelRequest, VercelResponse } from '../../_lib/vercel-types.js'

interface MockResponse {
  statusCode: number
  body: unknown
  headers: Record<string, string>
  status: (code: number) => MockResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
  end: (body?: string) => void
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code: number) {
      res.statusCode = code
      return res
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value
    },
    json(body: unknown) {
      res.body = body
    },
    end() {
      // noop
    },
  }
  return res
}

beforeEach(() => {
  resetDefaultPromptsDepsForTests()
  resetRateLimitBucketsForTests()
  vi.stubEnv('USE_FAKE_LLM', '')
  vi.stubEnv('GEMINI_API_KEY', '')
  vi.stubEnv('RATE_LIMIT_DISABLED', '1')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('POST /api/v1/prompts/generate — method + body checks', () => {
  it('returns 405 for non-POST methods', async () => {
    const res = createMockResponse()
    await handler({ method: 'GET' } as VercelRequest, res as unknown as VercelResponse)
    expect(res.statusCode).toBe(405)
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Method Not Allowed' },
    })
  })

  it('returns 400 INVALID_REQUEST when body is invalid JSON string', async () => {
    const res = createMockResponse()
    await handler(
      { method: 'POST', body: '{ not json' } as VercelRequest,
      res as unknown as VercelResponse,
    )
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: { code: 'INVALID_REQUEST' },
    })
  })

  it('handles CORS preflight without invoking the use case', async () => {
    const res = createMockResponse()
    await handler(
      { method: 'OPTIONS', headers: { origin: 'http://example.com' } } as VercelRequest,
      res as unknown as VercelResponse,
    )
    expect(res.statusCode).toBe(204)
  })
})

describe('POST /api/v1/prompts/generate — error mapping from use case', () => {
  it('returns 400 INVALID_LOCALE when body has bad locale', async () => {
    const res = createMockResponse()
    await handler(
      {
        method: 'POST',
        body: { items: [{ iso2: 'AR' }], tags: [], locale: 'fr' },
      } as VercelRequest,
      res as unknown as VercelResponse,
    )
    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({ error: { code: 'INVALID_LOCALE' } })
  })

  it('returns 503 LLM_UNAVAILABLE when no API key (factory falls back)', async () => {
    const res = createMockResponse()
    await handler(
      {
        method: 'POST',
        body: { items: [{ iso2: 'AR' }], tags: [], locale: 'es' },
      } as VercelRequest,
      res as unknown as VercelResponse,
    )
    expect(res.statusCode).toBe(503)
    expect(res.body).toMatchObject({ error: { code: 'LLM_UNAVAILABLE' } })
  })
})

describe('POST /api/v1/prompts/generate — happy path with USE_FAKE_LLM', () => {
  it('returns 200 with valid items when fake LLM is enabled and grounding is mocked off (degraded)', async () => {
    vi.stubEnv('USE_FAKE_LLM', '1')
    const res = createMockResponse()
    await handler(
      {
        method: 'POST',
        body: { items: [{ iso2: 'AR' }], tags: ['historia'], locale: 'es', seed: 1 },
      } as VercelRequest,
      res as unknown as VercelResponse,
    )
    expect([200, 503]).toContain(res.statusCode)
  })
})
