import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildLearnProfileUrl,
  fetchLearnProfile,
  resolveLearnApiBaseUrl,
} from './learn-api-client'

describe('learn-api-client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('buildLearnProfileUrl normalizes iso2 and locale query', () => {
    expect(buildLearnProfileUrl('http://localhost:3000', 'ar', 'es')).toBe(
      'http://localhost:3000/api/v1/countries/AR/learn?locale=es',
    )
  })

  it('returns INTERNAL_ERROR when base URL is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const result = await fetchLearnProfile('AR', 'es')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL_ERROR')
    }
  })

  it('parses successful profile response', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          iso2: 'AR',
          locale: 'es',
          contentLocale: 'es',
          displayName: 'Argentina',
          title: 'Argentina',
          summary: 'Resumen',
          flagUrl: null,
          wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
          source: 'wikipedia',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await fetchLearnProfile('AR', 'es', fetchMock)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.displayName).toBe('Argentina')
      expect(result.data.contentLocale).toBe('es')
    }
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/countries/AR/learn?locale=es',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('maps API error payload on 404', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'WIKIPEDIA_PAGE_NOT_FOUND', message: 'not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await fetchLearnProfile('ZZ', 'es', fetchMock)

    expect(result).toEqual({
      ok: false,
      error: { code: 'WIKIPEDIA_PAGE_NOT_FOUND', message: 'not found' },
    })
  })

  it('returns WIKIPEDIA_UNAVAILABLE on network failure', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000')
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'))

    const result = await fetchLearnProfile('AR', 'es', fetchMock)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('WIKIPEDIA_UNAVAILABLE')
    }
  })

  it('resolveLearnApiBaseUrl strips trailing slash', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000/')
    expect(resolveLearnApiBaseUrl()).toBe('http://localhost:3000')
  })
})
