import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyLearnRateLimitIfNeeded } from './apply-learn-rate-limit'
import { resetRateLimitBucketsForTests } from './rate-limit'
import type { VercelResponse } from './vercel-types'

function createMockResponse(): VercelResponse & {
  headers: Record<string, string>
  statusCode: number
} {
  const headers: Record<string, string> = {}
  return {
    headers,
    statusCode: 200,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    json: vi.fn(),
    end: vi.fn(),
  }
}

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  resetRateLimitBucketsForTests()
})

describe('applyLearnRateLimitIfNeeded', () => {
  it('does not block when rate limit is disabled', () => {
    delete process.env.VERCEL_ENV
    const res = createMockResponse()
    const blocked = applyLearnRateLimitIfNeeded(
      { headers: { 'x-real-ip': '1.2.3.4' } },
      res,
    )
    expect(blocked).toBe(false)
    expect(res.json).not.toHaveBeenCalled()
  })

  it('returns 429 with RATE_LIMITED when over limit on preview', () => {
    process.env.VERCEL_ENV = 'preview'
    process.env.RATE_LIMIT_MAX = '1'
    process.env.RATE_LIMIT_WINDOW_MS = '60000'

    const req = { headers: { 'x-real-ip': '10.0.0.5' } }
    const res1 = createMockResponse()
    expect(applyLearnRateLimitIfNeeded(req, res1)).toBe(false)

    const res2 = createMockResponse()
    const blocked = applyLearnRateLimitIfNeeded(req, res2)
    expect(blocked).toBe(true)
    expect(res2.statusCode).toBe(429)
    expect(res2.headers['Retry-After']).toBeDefined()
    expect(res2.json).toHaveBeenCalledWith({
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    })
  })
})
