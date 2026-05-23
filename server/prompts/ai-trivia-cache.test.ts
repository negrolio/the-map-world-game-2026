import { describe, expect, it } from 'vitest'

import type { AiPromptItem } from '../../shared/ai-trivia-api.js'
import { createAiTriviaCache } from './ai-trivia-cache.js'

function makeItem(overrides: Partial<AiPromptItem> = {}): AiPromptItem {
  return {
    iso2: 'AR',
    tag: 'historia',
    riddle: '¿Qué país declaró su independencia en 1816?',
    difficulty: 'medium',
    source: {
      title: 'Independencia de la Argentina',
      locale: 'es',
      url: 'https://es.wikipedia.org/wiki/Independencia%20de%20la%20Argentina',
    },
    ...overrides,
  }
}

describe('createAiTriviaCache', () => {
  it('returns undefined on miss', () => {
    const cache = createAiTriviaCache({ now: () => 0 })
    expect(cache.get({ iso2: 'AR', tag: 'historia', locale: 'es' })).toBeUndefined()
  })

  it('returns stored item on hit before TTL', () => {
    let nowValue = 0
    const cache = createAiTriviaCache({ ttlMs: 1000, now: () => nowValue })
    const item = makeItem()
    cache.set({ iso2: 'AR', tag: 'historia', locale: 'es' }, item)
    nowValue = 500
    expect(cache.get({ iso2: 'AR', tag: 'historia', locale: 'es' })).toEqual(item)
  })

  it('returns undefined after TTL expires and deletes stale entry', () => {
    let nowValue = 0
    const cache = createAiTriviaCache({ ttlMs: 1000, now: () => nowValue })
    cache.set({ iso2: 'AR', tag: 'historia', locale: 'es' }, makeItem())
    nowValue = 2000
    expect(cache.get({ iso2: 'AR', tag: 'historia', locale: 'es' })).toBeUndefined()
    nowValue = 2001
    expect(cache.get({ iso2: 'AR', tag: 'historia', locale: 'es' })).toBeUndefined()
  })

  it('uses (iso2, tag, locale) as the composite key — distinct keys do not collide', () => {
    const cache = createAiTriviaCache({ now: () => 0 })
    const arHistoriaEs = makeItem({ iso2: 'AR', tag: 'historia' })
    const arMusicaEs = makeItem({ iso2: 'AR', tag: 'musica' })
    const arHistoriaEn = makeItem({ iso2: 'AR', tag: 'historia' })

    cache.set({ iso2: 'AR', tag: 'historia', locale: 'es' }, arHistoriaEs)
    cache.set({ iso2: 'AR', tag: 'musica', locale: 'es' }, arMusicaEs)
    cache.set({ iso2: 'AR', tag: 'historia', locale: 'en' }, arHistoriaEn)

    expect(cache.get({ iso2: 'AR', tag: 'historia', locale: 'es' })).toEqual(arHistoriaEs)
    expect(cache.get({ iso2: 'AR', tag: 'musica', locale: 'es' })).toEqual(arMusicaEs)
    expect(cache.get({ iso2: 'AR', tag: 'historia', locale: 'en' })).toEqual(arHistoriaEn)
    expect(cache.get({ iso2: 'BR', tag: 'historia', locale: 'es' })).toBeUndefined()
  })

  it('overwrites previous entry on repeated set', () => {
    const cache = createAiTriviaCache({ now: () => 0 })
    cache.set({ iso2: 'AR', tag: 'historia', locale: 'es' }, makeItem({ riddle: 'first' }))
    cache.set({ iso2: 'AR', tag: 'historia', locale: 'es' }, makeItem({ riddle: 'second' }))
    expect(cache.get({ iso2: 'AR', tag: 'historia', locale: 'es' })?.riddle).toBe('second')
  })
})
