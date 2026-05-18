import { createLearnCache } from './learn-cache'
import type { GetCountryLearnProfileDeps, LearnCache } from './learn-deps'
import { resolveLocalizedCountryName } from './resolve-localized-country-name'
import { createWikipediaClient } from './wikipedia-client'

let sharedCache: LearnCache | undefined

export function getDefaultLearnDeps(): GetCountryLearnProfileDeps {
  if (!sharedCache) {
    sharedCache = createLearnCache()
  }

  return {
    wikipediaClient: createWikipediaClient(),
    cache: sharedCache,
    resolveLocalizedName: resolveLocalizedCountryName,
  }
}

/** Reinicia caché compartida (solo tests). */
export function resetDefaultLearnDepsForTests(): void {
  sharedCache = undefined
}
