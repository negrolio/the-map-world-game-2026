import { createLearnCache } from './learn-cache.js'
import type { GetCountryLearnProfileDeps, LearnCache } from './learn-deps.js'
import { resolveLocalizedCountryName } from './resolve-localized-country-name.js'
import { createWikipediaClient } from './wikipedia-client.js'

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
