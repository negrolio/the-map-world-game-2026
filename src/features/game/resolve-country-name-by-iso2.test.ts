import { describe, expect, it } from 'vitest'

import { resolveCountryNameByIso2 } from './resolve-country-name-by-iso2'

describe('resolveCountryNameByIso2', () => {
  it('devuelve el nombre en español para un ISO2 catalogado', () => {
    expect(resolveCountryNameByIso2('AR', 'es')).toBe('Argentina')
  })

  it('devuelve el nombre en inglés para un ISO2 catalogado', () => {
    expect(resolveCountryNameByIso2('JP', 'en')).toBe('Japan')
  })

  it('normaliza el ISO2 a mayúsculas antes de buscar', () => {
    expect(resolveCountryNameByIso2('uy', 'es')).toBe('Uruguay')
  })

  it('cae al fallback defensivo {ISO2} cuando el código no está catalogado (RF-F29)', () => {
    expect(resolveCountryNameByIso2('ZZ', 'es')).toBe('{ZZ}')
  })

  it('aplica el fallback defensivo con mayúsculas (no preserva la entrada original)', () => {
    expect(resolveCountryNameByIso2('qq', 'en')).toBe('{QQ}')
  })
})
