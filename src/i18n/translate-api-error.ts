import type { TFunction } from 'i18next'

/** Traduce un `ApiErrorPayload.code` usando el namespace `errors`. */
export function translateApiErrorCode(
  t: TFunction,
  code: string,
  interpolation?: Record<string, unknown>,
): string {
  const translated = t(code, { ns: 'errors', ...interpolation })
  const fallbackKey = `errors:${code}`
  if (translated === fallbackKey || translated === code) {
    return t('UNKNOWN', { ns: 'errors' })
  }
  return translated
}
