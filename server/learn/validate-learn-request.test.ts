import { describe, expect, it } from 'vitest'
import { normalizeIso2, validateLearnRequest } from './validate-learn-request'

describe('validateLearnRequest', () => {
  it('rejects invalid locale', () => {
    const result = validateLearnRequest('AR', 'fr')
    expect(result).toEqual({
      ok: false,
      error: { code: 'INVALID_LOCALE', message: 'locale must be es or en' },
      httpStatus: 400,
    })
  })

  it('rejects unknown iso2', () => {
    const result = validateLearnRequest('ZZ', 'es')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('COUNTRY_NOT_FOUND')
      expect(result.httpStatus).toBe(404)
    }
  })

  it('rejects malformed iso2', () => {
    const result = validateLearnRequest('ARG', 'en')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('COUNTRY_NOT_FOUND')
    }
  })

  it('normalizes iso2 to uppercase and accepts catalog country', () => {
    const result = validateLearnRequest('ar', 'es')
    expect(result).toMatchObject({
      ok: true,
      data: {
        iso2: 'AR',
        locale: 'es',
        country: expect.objectContaining({ iso2: 'AR' }),
      },
    })
  })
})

describe('normalizeIso2', () => {
  it('trims and uppercases', () => {
    expect(normalizeIso2('  br  ')).toBe('BR')
  })
})
