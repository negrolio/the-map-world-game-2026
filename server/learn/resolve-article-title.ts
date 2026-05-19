import type { AppLocale } from '../../shared/app-locale.js'
import { getWikipediaSitelinkTitle } from './load-wikipedia-sitelinks.js'
import { toWikiTitlePathSegment } from './wikipedia-url.js'

export function buildArticleTitleCandidates(
  iso2: string,
  locale: AppLocale,
  displayName: string,
): readonly string[] {
  const candidates: string[] = []
  const seen = new Set<string>()

  const pushCandidate = (rawTitle: string): void => {
    const segment = toWikiTitlePathSegment(rawTitle)
    if (!segment || seen.has(segment)) {
      return
    }
    seen.add(segment)
    candidates.push(segment)
  }

  const sitelinkTitle = getWikipediaSitelinkTitle(iso2, locale)
  if (sitelinkTitle) {
    pushCandidate(sitelinkTitle)
  }

  pushCandidate(displayName)

  return candidates
}

/** Candidato único para fallback a inglés (sitelink enwiki). */
export function buildEnglishFallbackTitleCandidate(iso2: string): string | undefined {
  const title = getWikipediaSitelinkTitle(iso2, 'en')
  if (!title) {
    return undefined
  }
  return toWikiTitlePathSegment(title)
}
