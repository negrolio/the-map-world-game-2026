import { describe, expect, it, vi } from 'vitest'

import { createWikipediaGroundingClient } from './wikipedia-grounding-client.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function notFoundResponse(): Response {
  return new Response('not found', { status: 404 })
}

function serverErrorResponse(): Response {
  return new Response('boom', { status: 500 })
}

describe('createWikipediaGroundingClient', () => {
  it('returns { exists: false } when summary endpoint replies 404', async () => {
    const fetchImpl = vi.fn(async () => notFoundResponse())
    const client = createWikipediaGroundingClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.checkGrounding({
      iso2: 'AR',
      claimedTitle: 'Nonexistent article',
      claimedLocale: 'es',
    })
    expect(result).toEqual({ ok: true, exists: false })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns upstream failure when summary endpoint returns 5xx', async () => {
    const fetchImpl = vi.fn(async () => serverErrorResponse())
    const client = createWikipediaGroundingClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.checkGrounding({
      iso2: 'AR',
      claimedTitle: 'Whatever',
      claimedLocale: 'es',
    })
    expect(result).toEqual({ ok: false, code: 'WIKIPEDIA_UNAVAILABLE' })
  })

  it('returns { mentionsCountry: true } when links contain the canonical title', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('rest_v1/page/summary')) {
        return jsonResponse({ type: 'standard' })
      }
      return jsonResponse({
        query: {
          pages: [
            {
              title: 'Congreso de Tucumán',
              links: [{ title: 'Argentina' }, { title: 'Tucumán' }],
              categories: [{ title: 'Categoría:Historia de Argentina' }],
            },
          ],
        },
      })
    })
    const client = createWikipediaGroundingClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.checkGrounding({
      iso2: 'AR',
      claimedTitle: 'Congreso de Tucumán',
      claimedLocale: 'es',
    })
    expect(result).toEqual({ ok: true, exists: true, mentionsCountry: true })
  })

  it('returns { mentionsCountry: false } when links and categories do not match', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('rest_v1/page/summary')) {
        return jsonResponse({ type: 'standard' })
      }
      return jsonResponse({
        query: {
          pages: [
            {
              title: 'Some unrelated article',
              links: [{ title: 'Brazil' }],
              categories: [{ title: 'Category:Things' }],
            },
          ],
        },
      })
    })
    const client = createWikipediaGroundingClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.checkGrounding({
      iso2: 'AR',
      claimedTitle: 'Some unrelated article',
      claimedLocale: 'es',
    })
    expect(result).toEqual({ ok: true, exists: true, mentionsCountry: false })
  })

  it('matches when the article itself IS the country article (title equality)', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes('rest_v1/page/summary')) {
        return jsonResponse({ type: 'standard' })
      }
      return jsonResponse({
        query: {
          pages: [{ title: 'Argentina', links: [], categories: [] }],
        },
      })
    })
    const client = createWikipediaGroundingClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.checkGrounding({
      iso2: 'AR',
      claimedTitle: 'Argentina',
      claimedLocale: 'es',
    })
    expect(result).toEqual({ ok: true, exists: true, mentionsCountry: true })
  })

  it('treats disambiguation pages as missing (V5 fail)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ type: 'disambiguation' }))
    const client = createWikipediaGroundingClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    })
    const result = await client.checkGrounding({
      iso2: 'AR',
      claimedTitle: 'Mendoza',
      claimedLocale: 'es',
    })
    expect(result).toEqual({ ok: true, exists: false })
  })
})
