import type { AppLocale } from '../../shared/app-locale.js'
import {
  buildArticleTitleCandidates,
  buildEnglishFallbackTitleCandidate,
} from './resolve-article-title.js'
import type {
  WikipediaClient,
  WikipediaFetchResult,
  WikipediaLearnContent,
} from './learn-deps.js'
import { mapWikipediaSummaryToLearnContent } from './map-wikipedia-summary.js'
import type { WikipediaSummaryResponse } from './map-wikipedia-summary.js'
import { WIKIPEDIA_USER_AGENT } from './wikipedia-user-agent.js'
import {
  isWikipediaUpstreamFailure,
  wikipediaFetchJson,
} from './wikipedia-http.js'
import {
  buildSummaryUrl,
  buildTitleSearchUrl,
  toWikiTitlePathSegment,
} from './wikipedia-url.js'

const DEFAULT_TIMEOUT_MS = 8_000

interface WikipediaTitleSearchResponse {
  readonly pages?: ReadonlyArray<{ readonly title?: string }>
}

export interface CreateWikipediaClientOptions {
  readonly fetchImpl?: typeof fetch
  readonly userAgent?: string
  readonly timeoutMs?: number
}

export function createWikipediaClient(
  options: CreateWikipediaClientOptions = {},
): WikipediaClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const userAgent = options.userAgent ?? WIKIPEDIA_USER_AGENT
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return {
    fetchCountryLearnContent: (params) =>
      fetchCountryLearnContentImpl(params, { fetchImpl, userAgent, timeoutMs }),
  }
}

async function fetchCountryLearnContentImpl(
  params: {
    iso2: string
    locale: AppLocale
    displayName: string
  },
  config: {
    fetchImpl: typeof fetch
    userAgent: string
    timeoutMs: number
  },
): Promise<WikipediaFetchResult> {
  let sawUpstreamFailure = false

  const primaryResult = await fetchByTitleCandidates(
    params.iso2,
    params.locale,
    buildArticleTitleCandidates(params.iso2, params.locale, params.displayName),
    config,
  )
  if (primaryResult.kind === 'content') {
    return { ok: true, data: primaryResult.content }
  }
  if (primaryResult.kind === 'upstream') {
    sawUpstreamFailure = true
  }

  const searchResult = await searchAndFetchSummary(
    params.locale,
    params.displayName,
    config,
  )
  if (searchResult.kind === 'content') {
    return { ok: true, data: searchResult.content }
  }
  if (searchResult.kind === 'upstream') {
    sawUpstreamFailure = true
  }

  if (params.locale !== 'en') {
    const enTitle = buildEnglishFallbackTitleCandidate(params.iso2)
    if (enTitle) {
      const enResult = await fetchSummaryByTitleSegment('en', enTitle, config)
      if (enResult.kind === 'content') {
        return { ok: true, data: enResult.content }
      }
      if (enResult.kind === 'upstream') {
        sawUpstreamFailure = true
      }
    }
  }

  if (sawUpstreamFailure) {
    return { ok: false, code: 'WIKIPEDIA_UNAVAILABLE' }
  }

  return { ok: false, code: 'WIKIPEDIA_PAGE_NOT_FOUND' }
}

type SummaryAttemptResult =
  | { readonly kind: 'content'; readonly content: WikipediaLearnContent }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'upstream' }

async function fetchByTitleCandidates(
  _iso2: string,
  locale: AppLocale,
  candidates: readonly string[],
  config: { fetchImpl: typeof fetch; userAgent: string; timeoutMs: number },
): Promise<SummaryAttemptResult> {
  for (const titleSegment of candidates) {
    const result = await fetchSummaryByTitleSegment(locale, titleSegment, config)
    if (result.kind === 'content' || result.kind === 'upstream') {
      return result
    }
  }
  return { kind: 'not_found' }
}

async function fetchSummaryByTitleSegment(
  locale: AppLocale,
  titleSegment: string,
  config: { fetchImpl: typeof fetch; userAgent: string; timeoutMs: number },
): Promise<SummaryAttemptResult> {
  const url = buildSummaryUrl(locale, titleSegment)
  const response = await wikipediaFetchJson<WikipediaSummaryResponse>(url, config)

  if (response.ok) {
    const content = mapWikipediaSummaryToLearnContent(response.data, locale)
    if (content) {
      return { kind: 'content', content }
    }
    return { kind: 'not_found' }
  }

  if (isWikipediaUpstreamFailure(response)) {
    return { kind: 'upstream' }
  }

  return { kind: 'not_found' }
}

async function searchAndFetchSummary(
  locale: AppLocale,
  query: string,
  config: { fetchImpl: typeof fetch; userAgent: string; timeoutMs: number },
): Promise<SummaryAttemptResult> {
  const searchUrl = buildTitleSearchUrl(locale, query)
  const searchResponse = await wikipediaFetchJson<WikipediaTitleSearchResponse>(
    searchUrl,
    config,
  )

  if (!searchResponse.ok) {
    if (isWikipediaUpstreamFailure(searchResponse)) {
      return { kind: 'upstream' }
    }
    return { kind: 'not_found' }
  }

  const titles = (searchResponse.data.pages ?? [])
    .map((page) => page.title?.trim())
    .filter((title): title is string => Boolean(title))

  for (const title of titles) {
    const segment = toWikiTitlePathSegment(title)
    const summaryResult = await fetchSummaryByTitleSegment(locale, segment, config)
    if (summaryResult.kind === 'content') {
      return summaryResult
    }
    if (summaryResult.kind === 'upstream') {
      return summaryResult
    }
  }

  return { kind: 'not_found' }
}
