import type { AppLocale } from './app-locale.js'

export type LearnApiErrorCode =
  | 'INVALID_LOCALE'
  | 'COUNTRY_NOT_FOUND'
  | 'WIKIPEDIA_PAGE_NOT_FOUND'
  | 'WIKIPEDIA_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export interface ApiErrorPayload {
  readonly code: LearnApiErrorCode
  readonly message: string
}

export interface LearnProfile {
  readonly iso2: string
  readonly locale: AppLocale
  readonly title: string
  readonly summary: string
  readonly flagUrl: string | null
  readonly wikipediaUrl: string
  readonly source: 'wikipedia'
}

export type LearnSuccess<T> = {
  readonly ok: true
  readonly data: T
}

export type LearnFailure = {
  readonly ok: false
  readonly error: ApiErrorPayload
  readonly httpStatus: number
}

export type LearnResult<T> = LearnSuccess<T> | LearnFailure

export function learnErrorHttpStatus(code: LearnApiErrorCode): number {
  switch (code) {
    case 'INVALID_LOCALE':
      return 400
    case 'COUNTRY_NOT_FOUND':
    case 'WIKIPEDIA_PAGE_NOT_FOUND':
      return 404
    case 'RATE_LIMITED':
      return 429
    case 'WIKIPEDIA_UNAVAILABLE':
      return 503
    case 'INTERNAL_ERROR':
      return 500
  }
}

export function learnFailure(
  code: LearnApiErrorCode,
  message: string,
): LearnFailure {
  return {
    ok: false,
    error: { code, message },
    httpStatus: learnErrorHttpStatus(code),
  }
}
