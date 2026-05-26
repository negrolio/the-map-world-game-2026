import { describe, expect, it } from 'vitest'

import { mapAiItemsToPool } from './map-ai-items-to-pool'

const sourceEs = {
  title: 'Congreso de Tucumán',
  locale: 'es' as const,
  url: 'https://es.wikipedia.org/wiki/Congreso_de_Tucum%C3%A1n',
}

const sourceBr = {
  title: 'Imperio del Brasil',
  locale: 'es' as const,
  url: 'https://es.wikipedia.org/wiki/Imperio_del_Brasil',
}

describe('mapAiItemsToPool', () => {
  it('maps each item into a QuestionPoolItem keeping order, aiSource and aiRiddleId', () => {
    const result = mapAiItemsToPool({
      items: [
        {
          riddleId: 'k73ar',
          iso2: 'AR',
          tag: 'historia',
          riddle: 'r1',
          difficulty: 'medium',
          source: sourceEs,
        },
        {
          riddleId: 'k73br',
          iso2: 'BR',
          tag: 'historia',
          riddle: 'r2',
          difficulty: 'medium',
          source: sourceBr,
        },
      ],
      validIso2Set: new Set(['AR', 'BR']),
    })
    expect(result.droppedCount).toBe(0)
    expect(result.pool).toHaveLength(2)
    expect(result.pool[0]).toMatchObject({
      mode: 'ai',
      answerCountryCode: 'AR',
      prompt: 'r1',
      aiSource: sourceEs,
      aiRiddleId: 'k73ar',
    })
    expect(result.pool[1].answerCountryCode).toBe('BR')
    expect(result.pool[1].aiRiddleId).toBe('k73br')
  })

  it('drops items whose iso2 is not in validIso2Set', () => {
    const result = mapAiItemsToPool({
      items: [
        {
          riddleId: 'k73xx',
          iso2: 'XX',
          tag: 'historia',
          riddle: 'r1',
          difficulty: 'medium',
          source: sourceEs,
        },
        {
          riddleId: 'k73ar',
          iso2: 'AR',
          tag: 'historia',
          riddle: 'r2',
          difficulty: 'medium',
          source: sourceEs,
        },
      ],
      validIso2Set: new Set(['AR']),
    })
    expect(result.droppedCount).toBe(1)
    expect(result.pool).toHaveLength(1)
    expect(result.pool[0].answerCountryCode).toBe('AR')
    expect(result.pool[0].aiRiddleId).toBe('k73ar')
  })

  it('deduplicates repeated iso2 (defensive)', () => {
    const result = mapAiItemsToPool({
      items: [
        {
          riddleId: 'k73first',
          iso2: 'AR',
          tag: 'historia',
          riddle: 'r1',
          difficulty: 'medium',
          source: sourceEs,
        },
        {
          riddleId: 'k73second',
          iso2: 'AR',
          tag: 'musica',
          riddle: 'r2',
          difficulty: 'medium',
          source: sourceEs,
        },
      ],
      validIso2Set: new Set(['AR']),
    })
    expect(result.droppedCount).toBe(1)
    expect(result.pool).toHaveLength(1)
    expect(result.pool[0].aiRiddleId).toBe('k73first')
  })
})
