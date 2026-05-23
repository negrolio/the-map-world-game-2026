import type { AppLocale } from './app-locale.js'
import type { AiTriviaTagId } from './ai-trivia-tags-schema.js'

export type AiPromptsApiErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_LOCALE'
  | 'INVALID_TAG'
  | 'LLM_UNAVAILABLE'
  | 'LLM_RATE_LIMITED'
  | 'INSUFFICIENT_GROUNDING_BATCH'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export interface AiPromptsApiErrorPayload {
  readonly code: AiPromptsApiErrorCode
  readonly message: string
}

export interface AiPromptsRequestItem {
  readonly iso2: string
}

export interface AiPromptsRequest {
  readonly items: readonly AiPromptsRequestItem[]
  readonly tags: readonly AiTriviaTagId[]
  readonly locale: AppLocale
  readonly seed?: number
}

export interface AiPromptSource {
  readonly title: string
  readonly locale: AppLocale
  readonly url: string
}

export type AiPromptDifficulty = 'easy' | 'medium' | 'hard'

export interface AiPromptItem {
  readonly iso2: string
  readonly tag: AiTriviaTagId
  readonly riddle: string
  readonly difficulty: AiPromptDifficulty
  readonly source: AiPromptSource
}

export interface AiPromptsResponse {
  readonly items: readonly AiPromptItem[]
}

export interface AiPromptsSuccess {
  readonly ok: true
  readonly data: AiPromptsResponse
}

export interface AiPromptsFailure {
  readonly ok: false
  readonly error: AiPromptsApiErrorPayload
  readonly httpStatus: number
}

export type AiPromptsResult = AiPromptsSuccess | AiPromptsFailure

export function aiPromptsErrorHttpStatus(code: AiPromptsApiErrorCode): number {
  switch (code) {
    case 'INVALID_REQUEST':
    case 'INVALID_LOCALE':
    case 'INVALID_TAG':
      return 400
    case 'LLM_RATE_LIMITED':
    case 'RATE_LIMITED':
      return 429
    case 'LLM_UNAVAILABLE':
    case 'INSUFFICIENT_GROUNDING_BATCH':
      return 503
    case 'INTERNAL_ERROR':
      return 500
  }
}

export function aiPromptsFailure(
  code: AiPromptsApiErrorCode,
  message: string,
): AiPromptsFailure {
  return {
    ok: false,
    error: { code, message },
    httpStatus: aiPromptsErrorHttpStatus(code),
  }
}

export function isAiPromptsApiErrorCode(value: string): value is AiPromptsApiErrorCode {
  return (
    value === 'INVALID_REQUEST' ||
    value === 'INVALID_LOCALE' ||
    value === 'INVALID_TAG' ||
    value === 'LLM_UNAVAILABLE' ||
    value === 'LLM_RATE_LIMITED' ||
    value === 'INSUFFICIENT_GROUNDING_BATCH' ||
    value === 'RATE_LIMITED' ||
    value === 'INTERNAL_ERROR'
  )
}
