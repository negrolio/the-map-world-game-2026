import { describe, expect, it } from 'vitest'

import { validateAiPromptsRequest } from './validate-ai-prompts-request.js'

describe('validateAiPromptsRequest', () => {
  it('accepts a minimal valid body', () => {
    const result = validateAiPromptsRequest({
      items: [{ iso2: 'AR' }, { iso2: 'BR' }],
      tags: ['historia'],
      locale: 'es',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toEqual([{ iso2: 'AR' }, { iso2: 'BR' }])
      expect(result.data.tags).toEqual(['historia'])
      expect(result.data.locale).toBe('es')
    }
  })

  it('accepts tags: [] as "any tag from catalog"', () => {
    const result = validateAiPromptsRequest({
      items: [{ iso2: 'AR' }],
      tags: [],
      locale: 'en',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.tags).toEqual([])
    }
  })

  it('rejects null/undefined body with INVALID_REQUEST', () => {
    expect(validateAiPromptsRequest(null).ok).toBe(false)
    expect(validateAiPromptsRequest(undefined).ok).toBe(false)
  })

  it('rejects unsupported locale with INVALID_LOCALE', () => {
    const result = validateAiPromptsRequest({
      items: [{ iso2: 'AR' }],
      tags: [],
      locale: 'fr',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error.code).toBe('INVALID_LOCALE')
    }
  })

  it('rejects unknown tag with INVALID_TAG', () => {
    const result = validateAiPromptsRequest({
      items: [{ iso2: 'AR' }],
      tags: ['bogus'],
      locale: 'es',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error.code).toBe('INVALID_TAG')
    }
  })

  it('rejects empty items array with INVALID_REQUEST', () => {
    const result = validateAiPromptsRequest({
      items: [],
      tags: [],
      locale: 'es',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error.code).toBe('INVALID_REQUEST')
    }
  })

  it('rejects > 50 items with INVALID_REQUEST', () => {
    const items = Array.from({ length: 51 }, () => ({ iso2: 'AR' }))
    const result = validateAiPromptsRequest({
      items,
      tags: [],
      locale: 'es',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error.code).toBe('INVALID_REQUEST')
    }
  })

  it('rejects unknown iso2 with INVALID_REQUEST', () => {
    const result = validateAiPromptsRequest({
      items: [{ iso2: 'ZZ' }],
      tags: [],
      locale: 'es',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.error.code).toBe('INVALID_REQUEST')
    }
  })

  it('normalizes iso2 to uppercase and dedupes', () => {
    const result = validateAiPromptsRequest({
      items: [{ iso2: 'ar' }, { iso2: 'AR' }, { iso2: 'BR' }],
      tags: [],
      locale: 'es',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toEqual([{ iso2: 'AR' }, { iso2: 'BR' }])
    }
  })

  it('passes through optional seed when valid', () => {
    const result = validateAiPromptsRequest({
      items: [{ iso2: 'AR' }],
      tags: [],
      locale: 'es',
      seed: 42,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.seed).toBe(42)
    }
  })

  it('rejects non-finite seed with INVALID_REQUEST', () => {
    const result = validateAiPromptsRequest({
      items: [{ iso2: 'AR' }],
      tags: [],
      locale: 'es',
      seed: 'NaN',
    })
    expect(result.ok).toBe(false)
  })
})
