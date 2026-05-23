import type { AppLocale } from '../../shared/app-locale.js'
import { getWikipediaSitelinkTitle } from '../learn/load-wikipedia-sitelinks.js'
import { wikipediaFetchJson } from '../learn/wikipedia-http.js'
import { WIKIPEDIA_USER_AGENT } from '../learn/wikipedia-user-agent.js'
import {
  buildSummaryUrl,
  toWikiTitlePathSegment,
  wikipediaSiteOrigin,
} from '../learn/wikipedia-url.js'
import type {
  WikipediaGroundingCheck,
  WikipediaGroundingClient,
  WikipediaGroundingResult,
} from './prompts-deps.js'

const DEFAULT_TIMEOUT_MS = 8_000
const LINKS_LIMIT = 500

interface SummaryResponse {
  readonly type?: string
}

interface LinksApiResponse {
  readonly query?: {
    readonly pages?: ReadonlyArray<{
      readonly missing?: boolean
      readonly title?: string
      readonly links?: ReadonlyArray<{ readonly title?: string }>
      readonly categories?: ReadonlyArray<{ readonly title?: string }>
    }>
  }
}

export interface CreateWikipediaGroundingClientOptions {
  readonly fetchImpl?: typeof fetch
  readonly userAgent?: string
  readonly timeoutMs?: number
}

export function createWikipediaGroundingClient(
  options: CreateWikipediaGroundingClientOptions = {},
): WikipediaGroundingClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const userAgent = options.userAgent ?? WIKIPEDIA_USER_AGENT
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return {
    checkGrounding: (check) =>
      checkGroundingImpl(check, { fetchImpl, userAgent, timeoutMs }),
  }
}

async function checkGroundingImpl(
  check: WikipediaGroundingCheck,
  config: { fetchImpl: typeof fetch; userAgent: string; timeoutMs: number },
): Promise<WikipediaGroundingResult> {
  const existsResult = await articleExists(check.claimedLocale, check.claimedTitle, config)
  if (existsResult.kind === 'upstream') {
    return { ok: false, code: 'WIKIPEDIA_UNAVAILABLE' }
  }
  if (existsResult.kind === 'missing') {
    return { ok: true, exists: false }
  }

  const countryTitle = getWikipediaSitelinkTitle(check.iso2, check.claimedLocale)
  if (!countryTitle) {
    return { ok: true, exists: true, mentionsCountry: false }
  }

  const mentions = await articleMentionsCountry(
    check.claimedLocale,
    check.claimedTitle,
    countryTitle,
    config,
  )
  if (mentions.kind === 'upstream') {
    return { ok: false, code: 'WIKIPEDIA_UNAVAILABLE' }
  }
  return { ok: true, exists: true, mentionsCountry: mentions.found }
}

type ExistsAttempt =
  | { readonly kind: 'exists' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'upstream' }

async function articleExists(
  locale: AppLocale,
  title: string,
  config: { fetchImpl: typeof fetch; userAgent: string; timeoutMs: number },
): Promise<ExistsAttempt> {
  const url = buildSummaryUrl(locale, toWikiTitlePathSegment(title))
  const response = await wikipediaFetchJson<SummaryResponse>(url, config)
  if (response.ok) {
    if (response.data?.type === 'disambiguation') {
      return { kind: 'missing' }
    }
    return { kind: 'exists' }
  }
  if (response.status === 404) {
    return { kind: 'missing' }
  }
  if (response.status === 'network' || (typeof response.status === 'number' && response.status >= 500)) {
    return { kind: 'upstream' }
  }
  return { kind: 'missing' }
}

type MentionsAttempt =
  | { readonly kind: 'ok'; readonly found: boolean }
  | { readonly kind: 'upstream' }

async function articleMentionsCountry(
  locale: AppLocale,
  articleTitle: string,
  countryTitle: string,
  config: { fetchImpl: typeof fetch; userAgent: string; timeoutMs: number },
): Promise<MentionsAttempt> {
  const url = buildLinksUrl(locale, articleTitle)
  const response = await wikipediaFetchJson<LinksApiResponse>(url, config)
  if (!response.ok) {
    if (
      response.status === 'network' ||
      (typeof response.status === 'number' && response.status >= 500)
    ) {
      return { kind: 'upstream' }
    }
    return { kind: 'ok', found: false }
  }
  const pages = response.data.query?.pages ?? []
  if (pages.length === 0) {
    return { kind: 'ok', found: false }
  }
  const page = pages[0]
  if (page.missing) {
    return { kind: 'ok', found: false }
  }
  const target = countryTitle.toLowerCase()
  if ((page.title?.toLowerCase() ?? '') === target) {
    return { kind: 'ok', found: true }
  }
  for (const link of page.links ?? []) {
    if ((link.title?.toLowerCase() ?? '') === target) {
      return { kind: 'ok', found: true }
    }
  }
  for (const category of page.categories ?? []) {
    if ((category.title?.toLowerCase() ?? '').includes(target)) {
      return { kind: 'ok', found: true }
    }
  }
  return { kind: 'ok', found: false }
}

function buildLinksUrl(locale: AppLocale, articleTitle: string): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'links|categories',
    titles: articleTitle,
    pllimit: String(LINKS_LIMIT),
    cllimit: String(LINKS_LIMIT),
    plnamespace: '0',
    formatversion: '2',
  })
  return `${wikipediaSiteOrigin(locale)}/w/api.php?${params.toString()}`
}
