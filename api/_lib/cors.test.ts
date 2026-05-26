import { describe, expect, it, vi } from 'vitest'
import {
  applyCorsHeaders,
  CORS_ALLOW_METHODS_GET,
  CORS_ALLOW_METHODS_POST,
  handleCorsPreflightIfNeeded,
  parseAllowedOrigins,
} from './cors'
import type { VercelResponse } from './vercel-types'

function createMockResponse(): VercelResponse & { headers: Record<string, string> } {
  const headers: Record<string, string> = {}
  const res = {
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
  return res
}

describe('parseAllowedOrigins', () => {
  it('parses comma-separated origins', () => {
    expect(
      parseAllowedOrigins('http://localhost:5173,http://localhost:3000'),
    ).toEqual(['http://localhost:5173', 'http://localhost:3000'])
  })
})

describe('applyCorsHeaders', () => {
  it('sets allow-origin for allowed request origin', () => {
    const res = createMockResponse()
    applyCorsHeaders(
      { headers: { origin: 'http://localhost:5173' } },
      res,
      ['http://localhost:5173'],
    )
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    expect(res.headers['Access-Control-Allow-Methods']).toBe(CORS_ALLOW_METHODS_GET)
  })

  it('advertises POST only when configured for POST handlers', () => {
    const res = createMockResponse()
    applyCorsHeaders(
      { headers: { origin: 'http://localhost:5173' } },
      res,
      ['http://localhost:5173'],
      CORS_ALLOW_METHODS_POST,
    )
    expect(res.headers['Access-Control-Allow-Methods']).toBe(CORS_ALLOW_METHODS_POST)
  })

  it('skips cors when origin is not allowed', () => {
    const res = createMockResponse()
    applyCorsHeaders(
      { headers: { origin: 'http://evil.example' } },
      res,
      ['http://localhost:5173'],
    )
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined()
  })
})

describe('handleCorsPreflightIfNeeded', () => {
  it('ends OPTIONS with 204', () => {
    const res = createMockResponse()
    const handled = handleCorsPreflightIfNeeded(
      { method: 'OPTIONS', headers: { origin: 'http://localhost:5173' } },
      res,
      ['http://localhost:5173'],
    )
    expect(handled).toBe(true)
    expect(res.statusCode).toBe(204)
    expect(res.end).toHaveBeenCalled()
  })
})
