import { describe, expect, it } from 'vitest'

import { buildPrompt } from './prompt-blueprint.js'

describe('buildPrompt', () => {
  it('builds system + user instructions with locale, attempt and tag hints', () => {
    const built = buildPrompt({
      locale: 'es',
      attempt: 1,
      items: [
        { iso2: 'AR', tag: 'historia' },
        { iso2: 'BR', tag: 'musica' },
      ],
    })
    expect(built.systemInstruction).toContain('riddles')
    expect(built.systemInstruction).toContain('20-280')
    expect(built.systemInstruction).toContain('insufficient_grounding')
    expect(built.userInstruction).toContain('iso2=AR, tag=historia, locale=es')
    expect(built.userInstruction).toContain('iso2=BR, tag=musica, locale=es')
    expect(built.userInstruction).toContain('- historia:')
    expect(built.userInstruction).toContain('- musica:')
    expect(built.userInstruction).not.toContain('Re-roll:')
  })

  it('appends a re-roll block on attempt > 1 with rule explanations', () => {
    const built = buildPrompt({
      locale: 'en',
      attempt: 2,
      items: [{ iso2: 'AR', tag: 'historia' }],
      rerollContext: [
        { iso2: 'AR', tag: 'historia', failedRule: 'V2_FORBIDDEN_TERM' },
      ],
    })
    expect(built.userInstruction).toContain('Re-roll:')
    expect(built.userInstruction).toContain('iso2=AR, tag=historia')
    expect(built.userInstruction.toLowerCase()).toContain('gentilicio')
  })

  it('produces a structured response schema', () => {
    const built = buildPrompt({
      locale: 'es',
      attempt: 1,
      items: [{ iso2: 'AR', tag: 'historia' }],
    })
    expect(built.responseSchema.type).toBe('object')
    const itemsSchema = built.responseSchema.properties as {
      items: { items: { properties: Record<string, unknown> } }
    }
    expect(itemsSchema.items.type).toBe('array')
    expect(itemsSchema.items.items.properties.expected_iso2).toBeDefined()
    expect(itemsSchema.items.items.properties.claimed_source_title).toBeDefined()
  })
})
