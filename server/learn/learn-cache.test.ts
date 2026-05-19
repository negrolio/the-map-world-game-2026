import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLearnCache } from './learn-cache'
import type { LearnProfile } from '../../shared/learn-types'

const sampleProfile: LearnProfile = {
  iso2: 'AR',
  locale: 'es',
  contentLocale: 'es',
  displayName: 'Argentina',
  title: 'Argentina',
  summary: 'Summary',
  flagUrl: null,
  wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
  source: 'wikipedia',
}

describe('createLearnCache', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns cached profile before TTL expires', () => {
    const now = vi.fn().mockReturnValue(1_000)
    const cache = createLearnCache({ ttlMs: 10_000, now })

    cache.set({ iso2: 'AR', locale: 'es' }, sampleProfile)
    now.mockReturnValue(10_000)

    expect(cache.get({ iso2: 'AR', locale: 'es' })).toEqual(sampleProfile)
  })

  it('expires entries after TTL', () => {
    const now = vi.fn().mockReturnValue(0)
    const cache = createLearnCache({ ttlMs: 5_000, now })

    cache.set({ iso2: 'AR', locale: 'es' }, sampleProfile)
    now.mockReturnValue(5_001)

    expect(cache.get({ iso2: 'AR', locale: 'es' })).toBeUndefined()
  })
})
