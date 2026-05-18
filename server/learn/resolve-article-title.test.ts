import { describe, expect, it } from 'vitest'
import { buildArticleTitleCandidates } from './resolve-article-title'

describe('buildArticleTitleCandidates', () => {
  it('includes iso override before localized name', () => {
    const candidates = buildArticleTitleCandidates('US', 'Estados Unidos')
    expect(candidates[0]).toBe('United_States')
    expect(candidates).toContain(encodeURIComponent('Estados_Unidos'))
  })

  it('encodes unicode titles for summary URLs', () => {
    const candidates = buildArticleTitleCandidates('CI', "Côte d'Ivoire")
    expect(candidates[0]).toBe(encodeURIComponent("Côte_d'Ivoire"))
  })
})
