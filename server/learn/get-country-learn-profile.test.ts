import { describe, expect, it, vi } from 'vitest'
import type { AppLocale } from '../../shared/app-locale'
import type { LearnProfile } from '../../shared/learn-types'
import { getCountryLearnProfile } from './get-country-learn-profile'
import { createLearnCache } from './learn-cache'
import type { GetCountryLearnProfileDeps, WikipediaClient } from './learn-deps'

function createDeps(overrides?: Partial<GetCountryLearnProfileDeps>): GetCountryLearnProfileDeps {
  const wikipediaClient: WikipediaClient = {
    fetchCountryLearnContent: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        locale: 'es',
        title: 'Argentina',
        summary: 'Resumen de prueba.',
        flagUrl: 'https://upload.wikimedia.org/example.jpg',
        wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
      },
    }),
  }

  const cache = {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }

  return {
    wikipediaClient,
    cache,
    resolveLocalizedName: (country) => country.name,
    ...overrides,
  }
}

describe('getCountryLearnProfile', () => {
  it('returns validation error without calling wikipedia', async () => {
    const deps = createDeps()
    const result = await getCountryLearnProfile('AR', 'fr', deps)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_LOCALE')
    }
    expect(deps.wikipediaClient.fetchCountryLearnContent).not.toHaveBeenCalled()
  })

  it('returns happy path profile from wikipedia client', async () => {
    const deps = createDeps()
    const result = await getCountryLearnProfile('AR', 'es', deps)

    expect(result).toEqual({
      ok: true,
      data: {
        iso2: 'AR',
        locale: 'es',
        title: 'Argentina',
        summary: 'Resumen de prueba.',
        flagUrl: 'https://upload.wikimedia.org/example.jpg',
        wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
        source: 'wikipedia',
      },
    })
    expect(deps.cache.set).toHaveBeenCalledWith(
      { iso2: 'AR', locale: 'es' },
      expect.objectContaining({ iso2: 'AR' }),
    )
  })

  it('returns cached profile without calling wikipedia', async () => {
    const cached: LearnProfile = {
      iso2: 'US',
      locale: 'en',
      title: 'United States',
      summary: 'Cached summary',
      flagUrl: null,
      wikipediaUrl: 'https://en.wikipedia.org/wiki/United_States',
      source: 'wikipedia',
    }

    const deps = createDeps({
      cache: {
        get: vi.fn().mockReturnValue(cached),
        set: vi.fn(),
      },
    })

    const result = await getCountryLearnProfile('US', 'en', deps)

    expect(result).toEqual({ ok: true, data: cached })
    expect(deps.wikipediaClient.fetchCountryLearnContent).not.toHaveBeenCalled()
    expect(deps.cache.set).not.toHaveBeenCalled()
  })

  it('falls back to en when requested locale has no wikipedia page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: 'WIKIPEDIA_PAGE_NOT_FOUND',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          locale: 'en' as AppLocale,
          title: 'Argentina',
          summary: 'English summary.',
          flagUrl: null,
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Argentina',
        },
      })

    const deps = createDeps({
      wikipediaClient: { fetchCountryLearnContent: fetchMock },
    })

    const result = await getCountryLearnProfile('AR', 'es', deps)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.locale).toBe('en')
      expect(result.data.summary).toBe('English summary.')
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toMatchObject({ locale: 'en' })
  })

  it('uses server cache and skips wikipedia on second identical request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        locale: 'es' as AppLocale,
        title: 'Argentina',
        summary: 'Cached path',
        flagUrl: null,
        wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
      },
    })

    const deps = createDeps({
      cache: createLearnCache(),
      wikipediaClient: { fetchCountryLearnContent: fetchMock },
    })

    const first = await getCountryLearnProfile('AR', 'es', deps)
    const second = await getCountryLearnProfile('AR', 'es', deps)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('maps wikipedia unavailable to learn failure', async () => {
    const deps = createDeps({
      wikipediaClient: {
        fetchCountryLearnContent: vi.fn().mockResolvedValue({
          ok: false,
          code: 'WIKIPEDIA_UNAVAILABLE',
        }),
      },
    })

    const result = await getCountryLearnProfile('AR', 'en', deps)

    expect(result).toEqual({
      ok: false,
      error: { code: 'WIKIPEDIA_UNAVAILABLE', message: 'WIKIPEDIA_UNAVAILABLE' },
      httpStatus: 503,
    })
  })
})
