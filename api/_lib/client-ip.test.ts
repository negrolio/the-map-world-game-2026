import { describe, expect, it } from 'vitest'
import { getClientIp } from './client-ip'

describe('getClientIp', () => {
  it('uses the first IP from x-forwarded-for', () => {
    expect(
      getClientIp({
        headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
      }),
    ).toBe('203.0.113.1')
  })

  it('falls back to x-real-ip', () => {
    expect(
      getClientIp({
        headers: { 'x-real-ip': '198.51.100.2' },
      }),
    ).toBe('198.51.100.2')
  })

  it('returns unknown when no IP headers', () => {
    expect(getClientIp({ headers: {} })).toBe('unknown')
  })
})
