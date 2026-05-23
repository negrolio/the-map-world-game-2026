import { describe, expect, it } from 'vitest'

import {
  MAX_AI_ATTEMPTS,
  PRELOAD_THRESHOLD,
  getAiScoreForAttempt,
  isAiAttemptNumber,
} from './ai-trivia-rules'

describe('ai-trivia-rules', () => {
  it('exports MAX_AI_ATTEMPTS = 3', () => {
    expect(MAX_AI_ATTEMPTS).toBe(3)
  })

  it('exports PRELOAD_THRESHOLD = 3', () => {
    expect(PRELOAD_THRESHOLD).toBe(3)
  })

  it('returns the scaled score for each attempt number', () => {
    expect(getAiScoreForAttempt(1)).toBe(1)
    expect(getAiScoreForAttempt(2)).toBe(0.5)
    expect(getAiScoreForAttempt(3)).toBe(0.25)
  })

  it('narrows valid attempt numbers', () => {
    expect(isAiAttemptNumber(1)).toBe(true)
    expect(isAiAttemptNumber(2)).toBe(true)
    expect(isAiAttemptNumber(3)).toBe(true)
    expect(isAiAttemptNumber(0)).toBe(false)
    expect(isAiAttemptNumber(4)).toBe(false)
  })
})
