import { getIsoWikipediaTitleOverride } from './iso-wikipedia-title-overrides'
import { toWikiTitlePathSegment } from './wikipedia-url'

export function buildArticleTitleCandidates(
  iso2: string,
  localizedName: string,
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

  const override = getIsoWikipediaTitleOverride(iso2)
  if (override) {
    pushCandidate(override)
  }

  pushCandidate(localizedName)

  return candidates
}
