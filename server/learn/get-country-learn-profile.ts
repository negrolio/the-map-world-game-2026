import type { AppLocale } from '../../shared/app-locale.js'
import { learnFailure, type LearnProfile, type LearnResult } from '../../shared/learn-types.js'
import type { CatalogCountry } from './countries-catalog.js'
import type {
  GetCountryLearnProfileDeps,
  WikipediaFetchResult,
  WikipediaLearnContent,
} from './learn-deps.js'
import { validateLearnRequest } from './validate-learn-request.js'

function toLearnProfile(
  iso2: string,
  requestedLocale: AppLocale,
  displayName: string,
  content: WikipediaLearnContent,
): LearnProfile {
  return {
    iso2,
    locale: requestedLocale,
    contentLocale: content.contentLocale,
    displayName,
    title: displayName,
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

async function fetchWithLocaleFallback(
  deps: GetCountryLearnProfileDeps,
  country: CatalogCountry,
  requestedLocale: AppLocale,
): Promise<{
  readonly wiki: WikipediaLearnContent
  readonly displayName: string
}> {
  const displayName = deps.resolveLocalizedName(country, requestedLocale)
  const primary = await deps.wikipediaClient.fetchCountryLearnContent({
    iso2: country.iso2,
    locale: requestedLocale,
    displayName,
  })

  if (primary.ok) {
    return { wiki: primary.data, displayName }
  }

  if (requestedLocale === 'en' || primary.code !== 'WIKIPEDIA_PAGE_NOT_FOUND') {
    throw primary
  }

  const fallbackDisplayName = deps.resolveLocalizedName(country, 'en')
  const fallback = await deps.wikipediaClient.fetchCountryLearnContent({
    iso2: country.iso2,
    locale: 'en',
    displayName: fallbackDisplayName,
  })

  if (!fallback.ok) {
    throw fallback
  }

  return { wiki: fallback.data, displayName }
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

  let wikiResult: { readonly wiki: WikipediaLearnContent; readonly displayName: string }
  try {
    wikiResult = await fetchWithLocaleFallback(deps, country, locale)
  } catch (failure) {
    if (failure && typeof failure === 'object' && 'ok' in failure && failure.ok === false) {
      return mapWikipediaFailure(failure as Extract<WikipediaFetchResult, { ok: false }>)
    }
    return learnFailure('INTERNAL_ERROR', 'INTERNAL_ERROR')
  }

  const profile = toLearnProfile(iso2, locale, wikiResult.displayName, wikiResult.wiki)
  deps.cache.set({ iso2, locale }, profile)
  return { ok: true, data: profile }
}
