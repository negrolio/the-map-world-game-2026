import type { AppLocale } from '../../shared/app-locale'

export function wikipediaSiteOrigin(locale: AppLocale): string {
  return `https://${locale}.wikipedia.org`
}

export function toWikiTitlePathSegment(title: string): string {
  const normalized = title.trim().replace(/ /g, '_')
  return encodeURIComponent(normalized)
}

export function buildSummaryUrl(locale: AppLocale, titleSegment: string): string {
  return `${wikipediaSiteOrigin(locale)}/api/rest_v1/page/summary/${titleSegment}`
}

export function buildTitleSearchUrl(locale: AppLocale, query: string): string {
  const params = new URLSearchParams({ q: query, limit: '3' })
  return `${wikipediaSiteOrigin(locale)}/w/rest.php/v1/search/title?${params.toString()}`
}

export function isAllowedWikipediaPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && /\.wikipedia\.org$/i.test(parsed.hostname)
  } catch {
    return false
  }
}

export function isAllowedWikimediaAssetUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      (/\.wikipedia\.org$/i.test(parsed.hostname) ||
        /\.wikimedia\.org$/i.test(parsed.hostname))
    )
  } catch {
    return false
  }
}

export function assertWikipediaRequestUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (error) {
    throw new Error('Invalid Wikipedia request URL', { cause: error })
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Wikipedia requests must use HTTPS')
  }
  if (!/\.wikipedia\.org$/i.test(parsed.hostname)) {
    throw new Error('Wikipedia requests must target *.wikipedia.org')
  }
}
