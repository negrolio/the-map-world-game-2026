import { describe, expect, it } from 'vitest'
import { getCountryDisplayName } from './country-display-name.js'

describe('getCountryDisplayName', () => {
  it('returns Falkland Islands (Malvinas) for FK in en', () => {
    expect(getCountryDisplayName('FK', 'Falkland Islands', 'en')).toBe(
      'Falkland Islands (Malvinas)',
    )
  })

  it('returns Islas Malvinas for FK in es', () => {
    expect(getCountryDisplayName('FK', 'Falkland Islands', 'es')).toBe('Islas Malvinas')
  })

  it('returns Turquía for TR in es', () => {
    expect(getCountryDisplayName('TR', 'Turkey', 'es')).toBe('Turquía')
  })

  it('falls back to catalog name when i18n has no entry', () => {
    expect(getCountryDisplayName('ZZ', 'Unknownland', 'en')).toBe('Unknownland')
  })
})
