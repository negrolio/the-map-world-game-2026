import type { AppLocale } from '../../shared/app-locale'
import type { LearnProfile } from '../../shared/learn-types'

export interface WikipediaLearnContent {
  readonly locale: AppLocale
  readonly title: string
  readonly summary: string
  readonly flagUrl: string | null
  readonly wikipediaUrl: string
}

export type WikipediaFetchResult =
  | { readonly ok: true; readonly data: WikipediaLearnContent }
  | {
      readonly ok: false
      readonly code: 'WIKIPEDIA_PAGE_NOT_FOUND' | 'WIKIPEDIA_UNAVAILABLE'
    }

export interface WikipediaClient {
  fetchCountryLearnContent(params: {
    iso2: string
    locale: AppLocale
    localizedName: string
  }): Promise<WikipediaFetchResult>
}

export interface LearnCacheKey {
  readonly iso2: string
  readonly locale: AppLocale
}

export interface LearnCache {
  get(key: LearnCacheKey): LearnProfile | undefined
  set(key: LearnCacheKey, profile: LearnProfile): void
}

export interface GetCountryLearnProfileDeps {
  readonly wikipediaClient: WikipediaClient
  readonly cache: LearnCache
  readonly resolveLocalizedName: (
    country: { readonly iso2: string; readonly name: string },
    locale: AppLocale,
  ) => string
}
