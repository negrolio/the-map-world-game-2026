import { describe, expect, it } from 'vitest'

import {
  AI_TRIVIA_TAGS,
  AI_TRIVIA_TAG_IDS,
  getAiTriviaTagEntry,
  isAiTriviaTagId,
} from './ai-trivia-tags-schema.js'

describe('ai-trivia-tags-schema', () => {
  it('exports the closed v1 catalog (9 tags, expected ids, no duplicates)', () => {
    expect(AI_TRIVIA_TAG_IDS).toEqual([
      'historia',
      'politica',
      'geografia',
      'flora-y-fauna',
      'cultura-general',
      'musica',
      'literatura',
      'cine',
      'deportes',
    ])
    expect(new Set(AI_TRIVIA_TAG_IDS).size).toBe(AI_TRIVIA_TAG_IDS.length)
  })

  it('every tag has non-empty labels and prompt hints in es and en', () => {
    for (const tag of AI_TRIVIA_TAGS) {
      expect(tag.labels.es.trim().length).toBeGreaterThan(0)
      expect(tag.labels.en.trim().length).toBeGreaterThan(0)
      expect(tag.promptHint.es.trim().length).toBeGreaterThan(0)
      expect(tag.promptHint.en.trim().length).toBeGreaterThan(0)
    }
  })

  it('politica prompt hint contains the historic-only guardrail in both locales', () => {
    const politica = getAiTriviaTagEntry('politica')
    expect(politica.promptHint.es.toLowerCase()).toContain('hist')
    expect(politica.promptHint.en.toLowerCase()).toContain('histor')
  })

  it('does not include the UI pseudo-tag "todas"', () => {
    expect(isAiTriviaTagId('todas')).toBe(false)
    expect(AI_TRIVIA_TAG_IDS).not.toContain('todas')
  })

  it('isAiTriviaTagId narrows correctly', () => {
    expect(isAiTriviaTagId('historia')).toBe(true)
    expect(isAiTriviaTagId('not-a-tag')).toBe(false)
  })

  it('getAiTriviaTagEntry throws on unknown id at runtime', () => {
    expect(() => getAiTriviaTagEntry('not-a-tag' as never)).toThrow(/Unknown/)
  })
})
