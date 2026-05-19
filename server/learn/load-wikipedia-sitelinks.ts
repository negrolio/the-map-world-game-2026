import type { AppLocale } from '../../shared/app-locale.js'
import type { WikipediaSitelinksMap } from '../../shared/wikipedia-sitelinks-types.js'
import sitelinksJson from '../../shared/wikipedia-sitelinks.json' with { type: 'json' }

export const wikipediaSitelinks: WikipediaSitelinksMap = sitelinksJson

export function getWikipediaSitelinkTitle(iso2: string, locale: AppLocale): string | undefined {
  return wikipediaSitelinks[iso2]?.titles[locale]
}
