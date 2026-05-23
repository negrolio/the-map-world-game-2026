import { describe, expect, it } from 'vitest'

import { AI_TRIVIA_TAG_IDS } from '../../shared/ai-trivia-tags-schema.js'
import {
  assignTagsToItems,
  createSeededRandom,
  resolveTagUniverse,
} from './tag-picker.js'

describe('resolveTagUniverse', () => {
  it('returns full catalog when no tags are selected', () => {
    expect(resolveTagUniverse([])).toEqual(AI_TRIVIA_TAG_IDS)
  })

  it('returns selected subset when valid tags are provided', () => {
    expect(resolveTagUniverse(['historia', 'musica'])).toEqual(['historia', 'musica'])
  })

  it('falls back to full catalog when all selected tags are unknown', () => {
    expect(resolveTagUniverse(['bogus-tag'])).toEqual(AI_TRIVIA_TAG_IDS)
  })

  it('filters out unknown tags when at least one valid is present', () => {
    expect(resolveTagUniverse(['historia', 'unknown'])).toEqual(['historia'])
  })
})

describe('assignTagsToItems', () => {
  it('returns an entry per input item with a tag from the universe', () => {
    const items = [{ iso2: 'AR' }, { iso2: 'BR' }, { iso2: 'CL' }]
    const result = assignTagsToItems({
      items,
      selectedTags: ['historia', 'musica'],
      random: createSeededRandom(42),
    })
    expect(result.length).toBe(3)
    for (const entry of result) {
      expect(['historia', 'musica']).toContain(entry.tag)
    }
    expect(result.map((r) => r.iso2)).toEqual(['AR', 'BR', 'CL'])
  })

  it('is deterministic with the same seed', () => {
    const items = [{ iso2: 'AR' }, { iso2: 'BR' }, { iso2: 'CL' }, { iso2: 'PE' }]
    const a = assignTagsToItems({
      items,
      selectedTags: [],
      random: createSeededRandom(12_345),
    })
    const b = assignTagsToItems({
      items,
      selectedTags: [],
      random: createSeededRandom(12_345),
    })
    expect(a).toEqual(b)
  })

  it('produces a different distribution with different seeds (smoke)', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ iso2: `X${i}` }))
    const a = assignTagsToItems({
      items,
      selectedTags: [],
      random: createSeededRandom(1),
    })
    const b = assignTagsToItems({
      items,
      selectedTags: [],
      random: createSeededRandom(99_999),
    })
    expect(a.map((r) => r.tag)).not.toEqual(b.map((r) => r.tag))
  })

  it('throws if the resolved universe is empty (defensive)', () => {
    expect(() =>
      assignTagsToItems({
        items: [{ iso2: 'AR' }],
        selectedTags: [],
        random: () => 0,
      }),
    ).not.toThrow()
  })
})
