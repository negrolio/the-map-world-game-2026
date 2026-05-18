import type { LearnProfile } from '../../shared/learn-types.js'
import type { LearnCache, LearnCacheKey } from './learn-deps.js'

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

interface CacheEntry {
  readonly profile: LearnProfile
  readonly expiresAt: number
}

function cacheKeyString(key: LearnCacheKey): string {
  return `${key.iso2}:${key.locale}`
}

export interface CreateLearnCacheOptions {
  readonly ttlMs?: number
  readonly now?: () => number
}

export function createLearnCache(options: CreateLearnCacheOptions = {}): LearnCache {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const now = options.now ?? (() => Date.now())
  const store = new Map<string, CacheEntry>()

  return {
    get(key) {
      const stored = store.get(cacheKeyString(key))
      if (!stored) {
        return undefined
      }
      if (now() >= stored.expiresAt) {
        store.delete(cacheKeyString(key))
        return undefined
      }
      return stored.profile
    },
    set(key, profile) {
      store.set(cacheKeyString(key), {
        profile,
        expiresAt: now() + ttlMs,
      })
    },
  }
}
