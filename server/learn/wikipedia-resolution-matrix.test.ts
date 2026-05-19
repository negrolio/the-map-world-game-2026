import { describe, expect, it } from 'vitest'
import { buildArticleTitleCandidates } from './resolve-article-title'
import { getSitelinkArticleTitle } from './resolve-wikipedia-article-title'

const MATRIX_ISO2 = ['AR', 'TR', 'CD', 'FK', 'GB', 'US', 'BR', 'DE', 'JP', 'CN', 'IN', 'FR'] as const

describe('wikipedia resolution matrix', () => {
  it.each(MATRIX_ISO2)('%s has en and es sitelinks in committed map', (iso2) => {
    expect(getSitelinkArticleTitle(iso2, 'en')).toBeTruthy()
    expect(getSitelinkArticleTitle(iso2, 'es')).toBeTruthy()
  })

  it.each(MATRIX_ISO2)('%s first candidate uses sitelink for es locale', (iso2) => {
    const sitelink = getSitelinkArticleTitle(iso2, 'es')
    expect(sitelink).toBeDefined()
    const candidates = buildArticleTitleCandidates(iso2, 'es', 'Nombre de prueba')
    const expectedSegment = encodeURIComponent(sitelink!.replace(/ /g, '_'))
    expect(candidates[0]).toBe(expectedSegment)
  })
})
