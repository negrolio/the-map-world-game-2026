import { describe, expect, it } from 'vitest'

import { resolveInitialLocale } from './resolve-initial-locale'

describe('resolveInitialLocale', () => {
  it('prioriza valor persistido válido sobre el navegador', () => {
    expect(resolveInitialLocale('en', 'es-ES')).toBe('en')
  })

  it('usa el navegador cuando no hay persistencia válida', () => {
    expect(resolveInitialLocale(null, 'en-US')).toBe('en')
    expect(resolveInitialLocale(undefined, 'es-AR')).toBe('es')
  })

  it('normaliza subcódigos de idioma', () => {
    expect(resolveInitialLocale('', 'en-GB')).toBe('en')
  })

  it('cae en fallback si el navegador no está soportado', () => {
    expect(resolveInitialLocale(null, 'de-DE')).toBe('es')
    expect(resolveInitialLocale('xx', 'ja')).toBe('es')
  })
})
