import type { AppLocale } from '../../shared/app-locale.js'
import type { WikipediaLearnContent } from './learn-deps.js'
import { isAllowedWikimediaAssetUrl, isAllowedWikipediaPageUrl } from './wikipedia-url.js'

export interface WikipediaSummaryResponse {
  readonly title?: string
  readonly extract?: string
  readonly thumbnail?: { readonly source?: string }
  readonly content_urls?: {
    readonly desktop?: { readonly page?: string }
  }
}

export function mapWikipediaSummaryToLearnContent(
  body: WikipediaSummaryResponse,
  contentLocale: AppLocale,
): WikipediaLearnContent | null {
  const summary = body.extract?.trim()
  const wikipediaUrl = body.content_urls?.desktop?.page?.trim()

  if (!summary || !wikipediaUrl) {
    return null
  }

  if (!isAllowedWikipediaPageUrl(wikipediaUrl)) {
    return null
  }

  const rawFlagUrl = body.thumbnail?.source?.trim()
  const flagUrl =
    rawFlagUrl && isAllowedWikimediaAssetUrl(rawFlagUrl) ? rawFlagUrl : null

  return {
    contentLocale,
    summary,
    flagUrl,
    wikipediaUrl,
  }
}
