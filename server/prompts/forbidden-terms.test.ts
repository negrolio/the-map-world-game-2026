import { describe, expect, it } from 'vitest'

import {
  findFirstForbiddenTerm,
  getForbiddenTermsForIso2,
  getForbiddenTermsIso2Count,
  normalizeForMatch,
} from './forbidden-terms.js'

describe('forbidden-terms', () => {
  it('indexes at least every iso2 from the artifact', () => {
    expect(getForbiddenTermsIso2Count()).toBeGreaterThan(100)
  })

  it('returns terms for a known iso2 in the requested locale, deduped', () => {
    const terms = getForbiddenTermsForIso2('AR', 'es')
    expect(terms).not.toBeNull()
    expect(terms!.length).toBeGreaterThan(0)
    expect(new Set(terms).size).toBe(terms!.length)
  })

  it('falls back to including english terms even when locale is es', () => {
    const termsEs = getForbiddenTermsForIso2('AR', 'es')
    expect(termsEs!.some((term) => term.toLowerCase() === 'argentina')).toBe(true)
  })

  it('returns null for unknown iso2', () => {
    expect(getForbiddenTermsForIso2('ZZ', 'es')).toBeNull()
  })

  it('is iso2 case-insensitive', () => {
    expect(getForbiddenTermsForIso2('ar', 'es')).not.toBeNull()
  })
})

describe('findFirstForbiddenTerm', () => {
  it('matches case-insensitively', () => {
    expect(findFirstForbiddenTerm('Su capital es BUENOS AIRES.', ['buenos aires'])).toBe(
      'buenos aires',
    )
  })

  it('matches Unicode-NFC variants (accent equivalence after normalization)', () => {
    const composed = 'argentína'.normalize('NFC')
    const decomposed = 'argentína'.normalize('NFD')
    expect(findFirstForbiddenTerm(composed, [normalizeForMatch(decomposed)])).not.toBeNull()
  })

  it('returns null when no forbidden term appears', () => {
    expect(findFirstForbiddenTerm('Texto inocuo sobre cordilleras.', ['paraguay'])).toBeNull()
  })

  it('skips empty terms safely', () => {
    expect(findFirstForbiddenTerm('hola', ['', 'mundo'])).toBeNull()
  })

  it('returns the first matching term in iteration order', () => {
    const result = findFirstForbiddenTerm('Esto es Argentina y Buenos Aires.', [
      'buenos aires',
      'argentina',
    ])
    expect(result).toBe('buenos aires')
  })
})

describe('normalizeForMatch', () => {
  it('lowercases and normalizes to NFC', () => {
    const composed = normalizeForMatch('ÁRBOL')
    expect(composed).toBe('árbol')
    expect(composed).toBe('árbol'.normalize('NFC'))
  })
})
