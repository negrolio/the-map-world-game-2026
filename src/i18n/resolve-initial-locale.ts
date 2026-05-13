import type { AppLocale } from './app-locale'
import { FALLBACK_LOCALE, isAppLocale, normalizeAppLocale } from './app-locale'

/**
 * Orden producto: persistencia válida → idioma del navegador si está soportado → fallback fijo.
 */
export function resolveInitialLocale(
  persistedRaw: string | null | undefined,
  navigatorLanguage: string | null | undefined,
): AppLocale {
  if (isAppLocale(persistedRaw)) {
    return persistedRaw
  }

  const fromNavigator = navigatorLanguage ? normalizeAppLocale(navigatorLanguage) : null
  if (fromNavigator) {
    return fromNavigator
  }

  return FALLBACK_LOCALE
}
