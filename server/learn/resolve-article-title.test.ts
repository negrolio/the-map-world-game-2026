import { describe, expect, it } from 'vitest'
import { buildArticleTitleCandidates, buildEnglishFallbackTitleCandidate } from './resolve-article-title'

describe('buildArticleTitleCandidates', () => {
  it('prioritizes Wikidata sitelink over display name for TR in es', () => {
    const candidates = buildArticleTitleCandidates('TR', 'es', 'Turquía')
    expect(candidates[0]).toBe(encodeURIComponent('Turquía'))
    expect(candidates).not.toContain('Turkey')
  })

  it('uses Estados Unidos sitelink for US in es', () => {
    const candidates = buildArticleTitleCandidates('US', 'es', 'Estados Unidos')
    expect(candidates[0]).toBe(encodeURIComponent('Estados_Unidos'))
  })

  it('uses Ivory Coast sitelink for CI in en', () => {
    const candidates = buildArticleTitleCandidates('CI', 'en', "Côte d'Ivoire")
    expect(candidates[0]).toBe('Ivory_Coast')
  })

  it('uses Falkland Islands sitelink for FK in en', () => {
    const candidates = buildArticleTitleCandidates('FK', 'en', 'Falkland Islands (Malvinas)')
    expect(candidates[0]).toBe('Falkland_Islands')
  })

  it('uses RDC sitelink for CD in es', () => {
    const candidates = buildArticleTitleCandidates('CD', 'es', 'Congo (República Democrática del)')
    expect(candidates[0]).toBe(
      encodeURIComponent('República_Democrática_del_Congo'),
    )
  })
})

describe('buildEnglishFallbackTitleCandidate', () => {
  it('returns enwiki sitelink segment for CD', () => {
    expect(buildEnglishFallbackTitleCandidate('CD')).toBe(
      'Democratic_Republic_of_the_Congo',
    )
  })
})
