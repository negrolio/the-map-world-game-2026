import { describe, expect, it } from 'vitest'
import { getSitelinkArticleTitle } from './resolve-wikipedia-article-title'

describe('getSitelinkArticleTitle', () => {
  it('returns committed Wikidata titles for TR, CD, FK', () => {
    expect(getSitelinkArticleTitle('TR', 'es')).toBe('Turquía')
    expect(getSitelinkArticleTitle('TR', 'en')).toBe('Turkey')
    expect(getSitelinkArticleTitle('CD', 'es')).toBe('República Democrática del Congo')
    expect(getSitelinkArticleTitle('FK', 'en')).toBe('Falkland Islands')
  })
})
