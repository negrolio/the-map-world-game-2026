import type { AppLocale } from '../../shared/app-locale.js'
import { isAppLocale } from '../../shared/app-locale.js'
import {
  aiPromptsFailure,
  type AiPromptsFailure,
  type AiPromptsRequest,
  type AiPromptsRequestItem,
} from '../../shared/ai-trivia-api.js'
import {
  isAiTriviaTagId,
  type AiTriviaTagId,
} from '../../shared/ai-trivia-tags-schema.js'
import { findCountryByIso2 } from '../learn/countries-catalog.js'
import { MAX_ITEMS_PER_REQUEST } from './ai-trivia-constants.js'

export interface ValidatedAiPromptsRequest {
  readonly items: readonly AiPromptsRequestItem[]
  readonly tags: readonly AiTriviaTagId[]
  readonly locale: AppLocale
  readonly seed?: number
}

export type ValidateAiPromptsRequestResult =
  | { readonly ok: true; readonly data: ValidatedAiPromptsRequest }
  | { readonly ok: false; readonly failure: AiPromptsFailure }

export function validateAiPromptsRequest(
  raw: unknown,
): ValidateAiPromptsRequestResult {
  if (!raw || typeof raw !== 'object') {
    return fail(aiPromptsFailure('INVALID_REQUEST', 'Request body must be an object'))
  }

  const body = raw as Record<string, unknown>

  if (typeof body.locale !== 'string') {
    return fail(aiPromptsFailure('INVALID_LOCALE', 'locale is required'))
  }
  if (!isAppLocale(body.locale)) {
    return fail(aiPromptsFailure('INVALID_LOCALE', `Unsupported locale: ${body.locale}`))
  }
  const locale: AppLocale = body.locale

  if (!Array.isArray(body.items)) {
    return fail(aiPromptsFailure('INVALID_REQUEST', 'items must be an array'))
  }
  if (body.items.length === 0) {
    return fail(aiPromptsFailure('INVALID_REQUEST', 'items must not be empty'))
  }
  if (body.items.length > MAX_ITEMS_PER_REQUEST) {
    return fail(
      aiPromptsFailure(
        'INVALID_REQUEST',
        `items must contain at most ${String(MAX_ITEMS_PER_REQUEST)} entries`,
      ),
    )
  }

  const seenIso2 = new Set<string>()
  const items: AiPromptsRequestItem[] = []
  for (const entry of body.items) {
    if (!entry || typeof entry !== 'object') {
      return fail(aiPromptsFailure('INVALID_REQUEST', 'each item must be an object'))
    }
    const candidate = (entry as { iso2?: unknown }).iso2
    if (typeof candidate !== 'string') {
      return fail(aiPromptsFailure('INVALID_REQUEST', 'each item must have iso2 string'))
    }
    const iso2 = candidate.toUpperCase().trim()
    if (iso2.length === 0 || !findCountryByIso2(iso2)) {
      return fail(aiPromptsFailure('INVALID_REQUEST', `unknown iso2: ${candidate}`))
    }
    if (seenIso2.has(iso2)) {
      continue
    }
    seenIso2.add(iso2)
    items.push({ iso2 })
  }

  if (!Array.isArray(body.tags)) {
    return fail(aiPromptsFailure('INVALID_REQUEST', 'tags must be an array'))
  }
  const tags: AiTriviaTagId[] = []
  for (const tag of body.tags) {
    if (typeof tag !== 'string' || !isAiTriviaTagId(tag)) {
      return fail(aiPromptsFailure('INVALID_TAG', `unknown tag: ${String(tag)}`))
    }
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
  }

  let seed: number | undefined
  if (body.seed !== undefined) {
    if (typeof body.seed !== 'number' || !Number.isFinite(body.seed)) {
      return fail(aiPromptsFailure('INVALID_REQUEST', 'seed must be a finite number'))
    }
    seed = body.seed
  }

  return {
    ok: true,
    data: { items, tags, locale, seed },
  }
}

function fail(failure: AiPromptsFailure): ValidateAiPromptsRequestResult {
  return { ok: false, failure }
}

export function isAiPromptsRequest(value: unknown): value is AiPromptsRequest {
  return validateAiPromptsRequest(value).ok
}
