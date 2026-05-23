import type { AiPromptItem } from '../../shared/ai-trivia-api.js'
import { AI_TRIVIA_CACHE_TTL_MS } from './ai-trivia-constants.js'
import type { AiTriviaCache, AiTriviaCacheKey } from './prompts-deps.js'

interface CacheEntry {
  readonly item: AiPromptItem
  readonly expiresAt: number
}

function cacheKeyString(key: AiTriviaCacheKey): string {
  return `${key.iso2}:${key.tag}:${key.locale}`
}

export interface CreateAiTriviaCacheOptions {
  readonly ttlMs?: number
  readonly now?: () => number
}

export function createAiTriviaCache(
  options: CreateAiTriviaCacheOptions = {},
): AiTriviaCache {
  const ttlMs = options.ttlMs ?? AI_TRIVIA_CACHE_TTL_MS
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
      return stored.item
    },
    set(key, item) {
      store.set(cacheKeyString(key), {
        item,
        expiresAt: now() + ttlMs,
      })
    },
  }
}
