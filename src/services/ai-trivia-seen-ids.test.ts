import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  addSeenRiddleId,
  clearSeenRiddleIds,
  getSeenRiddleIds,
} from './ai-trivia-seen-ids'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('ai-trivia-seen-ids', () => {
  it('returns [] when nothing has been stored', () => {
    expect(getSeenRiddleIds('es')).toEqual([])
  })

  it('round-trips a single id via add → get', () => {
    addSeenRiddleId('es', 'k73abc')
    expect(getSeenRiddleIds('es')).toEqual(['k73abc'])
  })

  it('dedupes repeated ids', () => {
    addSeenRiddleId('es', 'k73abc')
    addSeenRiddleId('es', 'k73abc')
    addSeenRiddleId('es', 'k73def')
    expect(getSeenRiddleIds('es')).toEqual(['k73abc', 'k73def'])
  })

  it('ignores empty ids', () => {
    addSeenRiddleId('es', '')
    expect(getSeenRiddleIds('es')).toEqual([])
  })

  it('keeps a sliding window capped at 500 entries', () => {
    for (let i = 0; i < 510; i += 1) {
      addSeenRiddleId('es', `id-${String(i)}`)
    }
    const stored = getSeenRiddleIds('es')
    expect(stored).toHaveLength(500)
    expect(stored[0]).toBe('id-10')
    expect(stored[stored.length - 1]).toBe('id-509')
  })

  it('namespaces ids by locale', () => {
    addSeenRiddleId('es', 'k73abc')
    addSeenRiddleId('en', 'k73def')
    expect(getSeenRiddleIds('es')).toEqual(['k73abc'])
    expect(getSeenRiddleIds('en')).toEqual(['k73def'])
  })

  it('returns [] when stored payload is corrupted JSON', () => {
    localStorage.setItem('aiTrivia:seenIds:es', '{not json')
    expect(getSeenRiddleIds('es')).toEqual([])
  })

  it('returns [] when stored payload is not an array', () => {
    localStorage.setItem('aiTrivia:seenIds:es', JSON.stringify({ foo: 'bar' }))
    expect(getSeenRiddleIds('es')).toEqual([])
  })

  it('drops non-string entries from a corrupted array', () => {
    localStorage.setItem('aiTrivia:seenIds:es', JSON.stringify(['ok', 1, null, 'also']))
    expect(getSeenRiddleIds('es')).toEqual(['ok', 'also'])
  })

  it('clearSeenRiddleIds removes all ids for a locale only', () => {
    addSeenRiddleId('es', 'k73abc')
    addSeenRiddleId('en', 'k73def')
    clearSeenRiddleIds('es')
    expect(getSeenRiddleIds('es')).toEqual([])
    expect(getSeenRiddleIds('en')).toEqual(['k73def'])
  })
})
