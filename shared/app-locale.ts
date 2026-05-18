/** Locales soportados por la API de aprendizaje y la app (MVP). */
export type AppLocale = 'es' | 'en'

export const SUPPORTED_APP_LOCALES: readonly AppLocale[] = ['es', 'en']

export function isAppLocale(value: string): value is AppLocale {
  return value === 'es' || value === 'en'
}
