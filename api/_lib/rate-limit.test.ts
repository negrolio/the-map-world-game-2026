import { afterEach, describe, expect, it } from 'vitest'
import {
  checkRateLimit,
  isRateLimitEnabled,
  parseRateLimitConfig,
  resetRateLimitBucketsForTests,
} from './rate-limit'

afterEach(() => {
  resetRateLimitBucketsForTests()
})

describe('parseRateLimitConfig', () => {
  it('uses defaults when env is missing', () => {
    expect(parseRateLimitConfig({})).toEqual({
      maxRequests: 60,
      windowMs: 60_000,
    })
  })

  it('reads custom max and window from env', () => {
    expect(
      parseRateLimitConfig({
        RATE_LIMIT_MAX: '10',
        RATE_LIMIT_WINDOW_MS: '5000',
      }),
    ).toEqual({ maxRequests: 10, windowMs: 5000 })
  })
})

describe('isRateLimitEnabled', () => {
  it('is disabled locally by default', () => {
    expect(isRateLimitEnabled({})).toBe(false)
  })

  it('is enabled on Vercel preview and production', () => {
    expect(isRateLimitEnabled({ VERCEL_ENV: 'preview' })).toBe(true)
    expect(isRateLimitEnabled({ VERCEL_ENV: 'production' })).toBe(true)
  })

  it('can be forced on or off via env', () => {
    expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: '1' })).toBe(true)
    expect(
      isRateLimitEnabled({ VERCEL_ENV: 'production', RATE_LIMIT_DISABLED: '1' }),
    ).toBe(false)
  })
})

describe('checkRateLimit', () => {
  it('allows up to maxRequests within the window', () => {
    const config = { maxRequests: 2, windowMs: 10_000 }
    const t0 = 1_000_000

    expect(checkRateLimit('a', config, t0).allowed).toBe(true)
    expect(checkRateLimit('a', config, t0 + 1).allowed).toBe(true)
    expect(checkRateLimit('a', config, t0 + 2).allowed).toBe(false)
  })

  it('resets the window after windowMs', () => {
    const config = { maxRequests: 1, windowMs: 1_000 }
    const t0 = 2_000_000

    expect(checkRateLimit('b', config, t0).allowed).toBe(true)
    expect(checkRateLimit('b', config, t0 + 100).allowed).toBe(false)
    expect(checkRateLimit('b', config, t0 + 1_001).allowed).toBe(true)
  })

  it('returns retryAfterSeconds when blocked', () => {
    const config = { maxRequests: 1, windowMs: 10_000 }
    const t0 = 3_000_000

    checkRateLimit('c', config, t0)
    const blocked = checkRateLimit('c', config, t0 + 2_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(8)
  })
})
