import type { AppLocale } from '../../shared/app-locale'
import { learnFailure, type LearnProfile, type LearnResult } from '../../shared/learn-types'
import type { CatalogCountry } from './countries-catalog'
import type {
  GetCountryLearnProfileDeps,
  WikipediaFetchResult,
  WikipediaLearnContent,
} from './learn-deps'
import { validateLearnRequest } from './validate-learn-request'

function toLearnProfile(
  iso2: string,
  content: WikipediaLearnContent,
): LearnProfile {
  return {
    iso2,
    locale: content.locale,
    title: content.title,
    summary: content.summary,
    flagUrl: content.flagUrl,
    wikipediaUrl: content.wikipediaUrl,
    source: 'wikipedia',
  }
}

function mapWikipediaFailure(
  result: Extract<WikipediaFetchResult, { ok: false }>,
): LearnResult<LearnProfile> {
  return learnFailure(result.code, result.code)
}

async function fetchContentForLocale(
  deps: GetCountryLearnProfileDeps,
  country: CatalogCountry,
  locale: AppLocale,
): Promise<WikipediaFetchResult> {
  const localizedName = deps.resolveLocalizedName(country, locale)
  return deps.wikipediaClient.fetchCountryLearnContent({
    iso2: country.iso2,
    locale,
    localizedName,
  })
}

async function fetchWithLocaleFallback(
  deps: GetCountryLearnProfileDeps,
  country: CatalogCountry,
  requestedLocale: AppLocale,
): Promise<WikipediaFetchResult> {
  const primary = await fetchContentForLocale(deps, country, requestedLocale)
  if (primary.ok || requestedLocale === 'en') {
    return primary
  }
  if (primary.code !== 'WIKIPEDIA_PAGE_NOT_FOUND') {
    return primary
  }
  return fetchContentForLocale(deps, country, 'en')
}

export async function getCountryLearnProfile(
  iso2Raw: string,
  localeRaw: string,
  deps: GetCountryLearnProfileDeps,
): Promise<LearnResult<LearnProfile>> {
  const validated = validateLearnRequest(iso2Raw, localeRaw)
  if (!validated.ok) {
    return validated
  }

  const { iso2, locale, country } = validated.data

  const cached = deps.cache.get({ iso2, locale })
  if (cached) {
    return { ok: true, data: cached }
  }

  const wikiResult = await fetchWithLocaleFallback(deps, country, locale)
  if (!wikiResult.ok) {
    return mapWikipediaFailure(wikiResult)
  }

  const profile = toLearnProfile(iso2, wikiResult.data)
  deps.cache.set({ iso2, locale }, profile)
  return { ok: true, data: profile }
}
