import { describe, expect, it } from 'vitest'

import {
  aiPromptsErrorHttpStatus,
  aiPromptsFailure,
  isAiPromptsApiErrorCode,
} from './ai-trivia-api.js'

describe('ai-trivia-api', () => {
  it('maps each error code to its expected HTTP status', () => {
    expect(aiPromptsErrorHttpStatus('INVALID_REQUEST')).toBe(400)
    expect(aiPromptsErrorHttpStatus('INVALID_LOCALE')).toBe(400)
    expect(aiPromptsErrorHttpStatus('INVALID_TAG')).toBe(400)
    expect(aiPromptsErrorHttpStatus('LLM_RATE_LIMITED')).toBe(429)
    expect(aiPromptsErrorHttpStatus('RATE_LIMITED')).toBe(429)
    expect(aiPromptsErrorHttpStatus('LLM_UNAVAILABLE')).toBe(503)
    expect(aiPromptsErrorHttpStatus('INSUFFICIENT_GROUNDING_BATCH')).toBe(503)
    expect(aiPromptsErrorHttpStatus('INTERNAL_ERROR')).toBe(500)
  })

  it('aiPromptsFailure builds the discriminated union with HTTP status included', () => {
    const failure = aiPromptsFailure('LLM_UNAVAILABLE', 'down')
    expect(failure).toEqual({
      ok: false,
      error: { code: 'LLM_UNAVAILABLE', message: 'down' },
      httpStatus: 503,
    })
  })

  it('isAiPromptsApiErrorCode narrows the eight known codes only', () => {
    expect(isAiPromptsApiErrorCode('INVALID_REQUEST')).toBe(true)
    expect(isAiPromptsApiErrorCode('LLM_UNAVAILABLE')).toBe(true)
    expect(isAiPromptsApiErrorCode('INSUFFICIENT_GROUNDING_BATCH')).toBe(true)
    expect(isAiPromptsApiErrorCode('WIKIPEDIA_UNAVAILABLE')).toBe(false)
    expect(isAiPromptsApiErrorCode('NOT_A_CODE')).toBe(false)
  })
})
