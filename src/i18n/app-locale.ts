/** Locales soportados por la app (MVP). Ampliar el union al añadir idiomas. */
export type AppLocale = 'es' | 'en'

export const SUPPORTED_LOCALES: readonly AppLocale[] = ['es', 'en']

export const FALLBACK_LOCALE: AppLocale = 'es'

export const LOCALE_STORAGE_KEY = 'map-game:locale:v1'

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'es' || value === 'en'
}

export function normalizeAppLocale(languageTag: string): AppLocale | null {
  const base = languageTag.split('-')[0]?.toLowerCase()
  if (base === 'es' || base === 'en') {
    return base
  }
  return null
}
