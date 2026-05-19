import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getCountryLearnProfile } from './get-country-learn-profile'
import { createWikipediaClient } from './wikipedia-client'
import { resolveLocalizedCountryName } from './resolve-localized-country-name'
import { findCountryByIso2 } from './countries-catalog'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__')

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as T
}

function createMockFetch(
  handlers: Array<(url: string) => { status: number; body?: unknown } | undefined>,
): typeof fetch {
  return async (input) => {
    const url = typeof input === 'string' ? input : input.url
    for (const handler of handlers) {
      const response = handler(url)
      if (response) {
        return new Response(response.body ? JSON.stringify(response.body) : null, {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    return new Response(null, { status: 404 })
  }
}

describe('createWikipediaClient', () => {
  it('returns mapped content from summary endpoint', async () => {
    const summary = loadFixture('summary-argentina-es.json')
    const client = createWikipediaClient({
      fetchImpl: createMockFetch([
        (url) =>
          url.includes('/api/rest_v1/page/summary/') ? { status: 200, body: summary } : undefined,
      ]),
    })

    const result = await client.fetchCountryLearnContent({
      iso2: 'AR',
      locale: 'es',
      displayName: 'Argentina',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.contentLocale).toBe('es')
      expect(result.data.wikipediaUrl).toContain('es.wikipedia.org')
    }
  })

  it('fetches TR in es via Turquía sitelink, not Turkey', async () => {
    const summary = loadFixture('summary-turquia-es.json')
    const requestedUrls: string[] = []
    const client = createWikipediaClient({
      fetchImpl: async (input) => {
        const url = typeof input === 'string' ? input : input.url
        requestedUrls.push(url)
        if (url.includes('es.wikipedia.org') && url.includes('Turqu')) {
          return new Response(JSON.stringify(summary), { status: 200 })
        }
        return new Response(null, { status: 404 })
      },
    })

    const result = await client.fetchCountryLearnContent({
      iso2: 'TR',
      locale: 'es',
      displayName: 'Turquía',
    })

    expect(result.ok).toBe(true)
    expect(requestedUrls.some((u) => u.includes('Turqu%C3%ADa') || u.includes('Turquía'))).toBe(
      true,
    )
    expect(requestedUrls.some((u) => u.includes('Turkey'))).toBe(false)
  })

  it('fetches FK in en via Falkland Islands sitelink', async () => {
    const summary = loadFixture('summary-falklands-en.json')
    const client = createWikipediaClient({
      fetchImpl: createMockFetch([
        (url) =>
          url.includes('en.wikipedia.org') && url.includes('Falkland_Islands')
            ? { status: 200, body: summary }
            : undefined,
      ]),
    })

    const result = await client.fetchCountryLearnContent({
      iso2: 'FK',
      locale: 'en',
      displayName: 'Falkland Islands (Malvinas)',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.wikipediaUrl).toContain('en.wikipedia.org/wiki/Falkland_Islands')
    }
  })

  it('fetches CD in es via República Democrática del Congo sitelink', async () => {
    const summary = loadFixture('summary-rdc-es.json')
    const client = createWikipediaClient({
      fetchImpl: createMockFetch([
        (url) =>
          url.includes('es.wikipedia.org') &&
          (url.includes('Rep%C3%BAblica') || url.includes('República'))
            ? { status: 200, body: summary }
            : undefined,
      ]),
    })

    const result = await client.fetchCountryLearnContent({
      iso2: 'CD',
      locale: 'es',
      displayName: 'Congo (República Democrática del)',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.contentLocale).toBe('es')
      expect(result.data.summary).toContain('República Democrática')
    }
  })

  it('uses title search when direct summary returns 404', async () => {
    const summary = loadFixture('summary-argentina-es.json')
    const search = loadFixture('search-title-argentina.json')
    const client = createWikipediaClient({
      fetchImpl: createMockFetch([
        (url) => {
          if (url.includes('/w/rest.php/v1/search/title')) {
            return { status: 200, body: search }
          }
          if (url.includes('/api/rest_v1/page/summary/')) {
            return { status: 200, body: summary }
          }
          return undefined
        },
      ]),
    })

    const result = await client.fetchCountryLearnContent({
      iso2: 'AR',
      locale: 'es',
      displayName: 'República Argentina',
    })

    expect(result.ok).toBe(true)
  })

  it('returns WIKIPEDIA_PAGE_NOT_FOUND when summary and search fail', async () => {
    const client = createWikipediaClient({
      fetchImpl: createMockFetch([
        (url) => {
          if (url.includes('/w/rest.php/v1/search/title')) {
            return { status: 200, body: { pages: [] } }
          }
          return { status: 404 }
        },
      ]),
    })

    const result = await client.fetchCountryLearnContent({
      iso2: 'ZZ',
      locale: 'es',
      displayName: 'País inventado',
    })

    expect(result).toEqual({ ok: false, code: 'WIKIPEDIA_PAGE_NOT_FOUND' })
  })

  it('returns WIKIPEDIA_UNAVAILABLE on upstream errors', async () => {
    const client = createWikipediaClient({
      fetchImpl: createMockFetch([() => ({ status: 503 })]),
    })

    const result = await client.fetchCountryLearnContent({
      iso2: 'AR',
      locale: 'en',
      displayName: 'Argentina',
    })

    expect(result).toEqual({ ok: false, code: 'WIKIPEDIA_UNAVAILABLE' })
  })

  it('sends User-Agent on requests', async () => {
    const seenHeaders: string[] = []
    const client = createWikipediaClient({
      userAgent: 'MapWorldGame/test',
      fetchImpl: async (input, init) => {
        const headers = new Headers(init?.headers)
        seenHeaders.push(headers.get('User-Agent') ?? '')
        return new Response(JSON.stringify(loadFixture('summary-argentina-es.json')), {
          status: 200,
        })
      },
    })

    await client.fetchCountryLearnContent({
      iso2: 'AR',
      locale: 'es',
      displayName: 'Argentina',
    })

    expect(seenHeaders[0]).toBe('MapWorldGame/test')
  })
})

describe('getCountryLearnProfile + createWikipediaClient', () => {
  it('integrates validation, wikipedia client and cache', async () => {
    const summary = loadFixture('summary-argentina-es.json')
    const cache = { get: () => undefined, set: () => undefined }
    const country = findCountryByIso2('AR')
    expect(country).toBeDefined()

    const result = await getCountryLearnProfile('ar', 'es', {
      wikipediaClient: createWikipediaClient({
        fetchImpl: createMockFetch([
          (url) =>
            url.includes('/api/rest_v1/page/summary/')
              ? { status: 200, body: summary }
              : undefined,
        ]),
      }),
      cache,
      resolveLocalizedName: resolveLocalizedCountryName,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.iso2).toBe('AR')
      expect(result.data.displayName).toBeTruthy()
      expect(result.data.source).toBe('wikipedia')
    }
  })
})
