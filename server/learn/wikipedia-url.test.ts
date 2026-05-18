import { describe, expect, it } from 'vitest'
import {
  assertWikipediaRequestUrl,
  buildSummaryUrl,
  isAllowedWikipediaPageUrl,
  toWikiTitlePathSegment,
} from './wikipedia-url'

describe('wikipedia-url', () => {
  it('builds summary URLs only on wikipedia.org', () => {
    expect(buildSummaryUrl('es', 'Argentina')).toBe(
      'https://es.wikipedia.org/api/rest_v1/page/summary/Argentina',
    )
  })

  it('encodes spaces in title segments', () => {
    expect(toWikiTitlePathSegment('South Korea')).toBe('South_Korea')
  })

  it('validates allowed wikipedia page URLs', () => {
    expect(isAllowedWikipediaPageUrl('https://es.wikipedia.org/wiki/Argentina')).toBe(
      true,
    )
    expect(isAllowedWikipediaPageUrl('https://evil.com/wiki/Argentina')).toBe(false)
  })

  it('rejects non-wikipedia hosts for fetch', () => {
    expect(() => assertWikipediaRequestUrl('https://evil.com/api')).toThrow(
      /wikipedia\.org/,
    )
  })
})
