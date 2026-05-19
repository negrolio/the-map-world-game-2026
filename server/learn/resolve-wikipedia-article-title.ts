import type { AppLocale } from '../../shared/app-locale.js'
import { getWikipediaSitelinkTitle } from './load-wikipedia-sitelinks.js'

export function getSitelinkArticleTitle(iso2: string, locale: AppLocale): string | undefined {
  return getWikipediaSitelinkTitle(iso2, locale)
}
