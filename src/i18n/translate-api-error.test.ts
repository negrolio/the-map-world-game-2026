import { describe, expect, it } from 'vitest'

import { i18n } from './i18n'
import { translateApiErrorCode } from './translate-api-error'

describe('translateApiErrorCode (learn errors)', () => {
  it('translates learn API codes in Spanish', async () => {
    await i18n.changeLanguage('es')
    expect(translateApiErrorCode(i18n.t, 'WIKIPEDIA_PAGE_NOT_FOUND')).toBe(
      'No encontramos un artículo de Wikipedia para este país.',
    )
  })

  it('translates learn API codes in English', async () => {
    await i18n.changeLanguage('en')
    expect(translateApiErrorCode(i18n.t, 'INVALID_LOCALE')).toBe(
      'Unsupported language. Choose Spanish or English.',
    )
  })
})
