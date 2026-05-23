import { describe, expect, it } from 'vitest'

import { createLlmClientFake } from './llm-client-fake.js'

describe('createLlmClientFake', () => {
  it('returns a default ok response with one stub per item', async () => {
    const client = createLlmClientFake()
    const result = await client.generateRiddles({
      items: [
        { iso2: 'AR', tag: 'historia' },
        { iso2: 'BR', tag: 'musica' },
      ],
      locale: 'es',
      attempt: 1,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toHaveLength(2)
      const first = result.data.items[0]
      expect(first.kind).toBe('ok')
      if (first.kind === 'ok') {
        expect(first.iso2).toBe('AR')
        expect(first.tag).toBe('historia')
      }
    }
  })

  it('uses the responder callback when provided', async () => {
    const client = createLlmClientFake({
      respond: (input) => ({
        items: input.items.map((item) => ({
          kind: 'insufficient_grounding',
          iso2: item.iso2,
          tag: item.tag,
        })),
      }),
    })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items[0].kind).toBe('insufficient_grounding')
    }
  })

  it('returns failure code when respondFailure is set', async () => {
    const client = createLlmClientFake({ respondFailure: 'LLM_RATE_LIMITED' })
    const result = await client.generateRiddles({
      items: [{ iso2: 'AR', tag: 'historia' }],
      locale: 'es',
      attempt: 1,
    })
    expect(result).toEqual({ ok: false, code: 'LLM_RATE_LIMITED' })
  })
})
