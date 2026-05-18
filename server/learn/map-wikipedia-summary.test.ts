import { describe, expect, it } from 'vitest'
import summaryArgentina from './__fixtures__/summary-argentina-es.json'
import summaryNoThumbnail from './__fixtures__/summary-no-thumbnail.json'
import { mapWikipediaSummaryToLearnContent } from './map-wikipedia-summary'

describe('mapWikipediaSummaryToLearnContent', () => {
  it('maps a full summary response', () => {
    const mapped = mapWikipediaSummaryToLearnContent(summaryArgentina, 'es')
    expect(mapped).toEqual({
      locale: 'es',
      title: 'Argentina',
      summary: expect.stringContaining('República Argentina'),
      flagUrl: expect.stringContaining('upload.wikimedia.org'),
      wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
    })
  })

  it('allows null flag when thumbnail is missing', () => {
    const mapped = mapWikipediaSummaryToLearnContent(summaryNoThumbnail, 'en')
    expect(mapped?.flagUrl).toBeNull()
    expect(mapped?.wikipediaUrl).toBe('https://en.wikipedia.org/wiki/Exampleland')
  })

  it('rejects non-wikipedia page URLs', () => {
    const mapped = mapWikipediaSummaryToLearnContent(
      {
        title: 'Bad',
        extract: 'Bad extract',
        content_urls: { desktop: { page: 'https://evil.example/wiki/Bad' } },
      },
      'en',
    )
    expect(mapped).toBeNull()
  })
})
