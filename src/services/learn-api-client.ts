import type { AppLocale } from '../i18n/app-locale'
import type { ApiErrorPayload } from '../types/api-contract'
import type { LearnProfile } from '../types/learn-api'

export type FetchLearnProfileResult =
  | { readonly ok: true; readonly data: LearnProfile }
  | { readonly ok: false; readonly error: ApiErrorPayload }

const LEARN_API_ERROR_CODES = new Set([
  'INVALID_LOCALE',
  'COUNTRY_NOT_FOUND',
  'WIKIPEDIA_PAGE_NOT_FOUND',
  'WIKIPEDIA_UNAVAILABLE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
])

export function resolveLearnApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw !== 'string') {
    return ''
  }
  return raw.trim().replace(/\/$/, '')
}

export function buildLearnProfileUrl(
  baseUrl: string,
  iso2: string,
  locale: AppLocale,
): string {
  const normalizedIso2 = iso2.trim().toUpperCase()
  const params = new URLSearchParams({ locale })
  return `${baseUrl}/api/v1/countries/${encodeURIComponent(normalizedIso2)}/learn?${params.toString()}`
}

function parseApiError(body: unknown): ApiErrorPayload {
  if (body && typeof body === 'object' && 'error' in body) {
    const nested = (body as { error?: unknown }).error
    if (nested && typeof nested === 'object' && 'code' in nested) {
      const code = (nested as { code: unknown }).code
      const message = (nested as { message?: unknown }).message
      if (typeof code === 'string' && LEARN_API_ERROR_CODES.has(code)) {
        return {
          code,
          message: typeof message === 'string' ? message : code,
        }
      }
    }
  }
  return { code: 'INTERNAL_ERROR', message: 'Request failed' }
}

function parseLearnProfile(body: unknown): LearnProfile | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const record = body as Record<string, unknown>
  const locale = record.locale
  if (locale !== 'es' && locale !== 'en') {
    return null
  }

  const contentLocale = record.contentLocale
  if (contentLocale !== 'es' && contentLocale !== 'en') {
    return null
  }

  const displayName =
    typeof record.displayName === 'string'
      ? record.displayName
      : typeof record.title === 'string'
        ? record.title
        : null

  if (
    typeof record.iso2 !== 'string' ||
    displayName === null ||
    typeof record.summary !== 'string' ||
    typeof record.wikipediaUrl !== 'string' ||
    record.source !== 'wikipedia'
  ) {
    return null
  }

  const flagUrl = record.flagUrl
  if (flagUrl !== null && typeof flagUrl !== 'string') {
    return null
  }

  return {
    iso2: record.iso2,
    locale,
    contentLocale,
    displayName,
    title: displayName,
    summary: record.summary,
    flagUrl,
    wikipediaUrl: record.wikipediaUrl,
    source: 'wikipedia',
  }
}

export async function fetchLearnProfile(
  iso2: string,
  locale: AppLocale,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchLearnProfileResult> {
  const baseUrl = resolveLearnApiBaseUrl()
  if (!baseUrl) {
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'VITE_API_BASE_URL is not configured',
      },
    }
  }

  const url = buildLearnProfileUrl(baseUrl, iso2, locale)

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      return { ok: false, error: parseApiError(body) }
    }

    const profile = parseLearnProfile(body)
    if (!profile) {
      return {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Invalid learn profile response' },
      }
    }

    return { ok: true, data: profile }
  } catch {
    return {
      ok: false,
      error: { code: 'WIKIPEDIA_UNAVAILABLE', message: 'Network request failed' },
    }
  }
}
