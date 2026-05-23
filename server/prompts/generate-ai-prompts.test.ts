import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AiPromptItem } from '../../shared/ai-trivia-api.js'
import { createAiTriviaCache } from './ai-trivia-cache.js'
import { generateAiPrompts } from './generate-ai-prompts.js'
import { createLlmClientFake } from './llm-client-fake.js'
import type {
  GenerateAiPromptsDeps,
  LlmClient,
  LlmGenerateOutputItem,
  WikipediaGroundingClient,
  WikipediaGroundingResult,
} from './prompts-deps.js'
import { resetAiTriviaLoggerForTests } from './ai-trivia-logger.js'

function makeOkOutput(
  iso2: string,
  tag: AiPromptItem['tag'],
  overrides: Partial<Extract<LlmGenerateOutputItem, { kind: 'ok' }>> = {},
): Extract<LlmGenerateOutputItem, { kind: 'ok' }> {
  return {
    kind: 'ok',
    iso2,
    tag,
    riddle:
      'Aquí gobernó una larga dinastía y se redactó una constitución pionera durante el siglo XIX.',
    expectedIso2: iso2,
    justification: 'stub',
    claimedSourceTitle: 'Imperio del Brasil',
    claimedSourceLocale: 'es',
    difficulty: 'medium',
    valid: true,
    ...overrides,
  }
}

function makeGroundingClient(
  result: WikipediaGroundingResult = { ok: true, exists: true, mentionsCountry: true },
): WikipediaGroundingClient {
  return {
    checkGrounding: vi.fn(async () => result),
  }
}

function makeDeps(overrides: Partial<GenerateAiPromptsDeps> = {}): GenerateAiPromptsDeps {
  return {
    llmClient: overrides.llmClient ?? createLlmClientFake(),
    groundingClient: overrides.groundingClient ?? makeGroundingClient(),
    cache: overrides.cache ?? createAiTriviaCache({ now: () => 0 }),
    now: overrides.now ?? (() => 0),
    random: overrides.random ?? (() => 0),
    tracer: overrides.tracer,
  }
}

beforeEach(() => {
  resetAiTriviaLoggerForTests()
})

describe('generateAiPrompts — request validation', () => {
  it('returns INVALID_LOCALE for bad locale', async () => {
    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: [], locale: 'fr' },
      makeDeps(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_LOCALE')
    }
  })

  it('returns INVALID_TAG for unknown tag', async () => {
    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: ['nope'], locale: 'es' },
      makeDeps(),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_TAG')
    }
  })
})

describe('generateAiPrompts — happy path', () => {
  it('returns one item per request item when the LLM and grounding both succeed', async () => {
    const llm: LlmClient = createLlmClientFake({
      respond: (input) => ({
        items: input.items.map((item) => makeOkOutput(item.iso2, item.tag)),
      }),
    })
    const result = await generateAiPrompts(
      {
        items: [{ iso2: 'AR' }, { iso2: 'BR' }],
        tags: ['historia'],
        locale: 'es',
        seed: 1,
      },
      makeDeps({ llmClient: llm }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items).toHaveLength(2)
      expect(result.data.items[0].source.url).toMatch(
        /^https:\/\/es\.wikipedia\.org\/wiki\//,
      )
    }
  })

  it('caches validated items and skips LLM on subsequent calls', async () => {
    const llm: LlmClient = {
      generateRiddles: vi.fn(async (input) => ({
        ok: true,
        data: { items: input.items.map((it) => makeOkOutput(it.iso2, it.tag)) },
      })),
    }
    const cache = createAiTriviaCache({ now: () => 0 })
    const deps = makeDeps({ llmClient: llm, cache })

    await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: ['historia'], locale: 'es', seed: 1 },
      deps,
    )
    await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: ['historia'], locale: 'es', seed: 1 },
      deps,
    )

    expect(llm.generateRiddles).toHaveBeenCalledTimes(1)
  })
})

describe('generateAiPrompts — re-rolls and circuit breaker', () => {
  it('re-rolls failed items up to MAX_REROLLS times then drops them', async () => {
    let calls = 0
    const llm: LlmClient = {
      generateRiddles: async (input) => {
        calls += 1
        return {
          ok: true,
          data: {
            items: input.items.map((it) =>
              makeOkOutput(it.iso2, it.tag, { expectedIso2: 'XX' }),
            ),
          },
        }
      },
    }
    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: ['historia'], locale: 'es', seed: 1 },
      makeDeps({ llmClient: llm }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INSUFFICIENT_GROUNDING_BATCH')
    }
    expect(calls).toBe(3)
  })

  it('returns LLM_UNAVAILABLE when the client fails (with mapped HTTP status)', async () => {
    const llm = createLlmClientFake({ respondFailure: 'LLM_UNAVAILABLE' })
    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: [], locale: 'es' },
      makeDeps({ llmClient: llm }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('LLM_UNAVAILABLE')
      expect(result.httpStatus).toBe(503)
    }
  })

  it('keeps valid items even when one of the items fails', async () => {
    const llm: LlmClient = createLlmClientFake({
      respond: (input) => ({
        items: input.items.map((it) =>
          it.iso2 === 'BR'
            ? makeOkOutput(it.iso2, it.tag, { expectedIso2: 'XX' })
            : makeOkOutput(it.iso2, it.tag),
        ),
      }),
    })
    const result = await generateAiPrompts(
      {
        items: [{ iso2: 'AR' }, { iso2: 'BR' }, { iso2: 'CL' }],
        tags: ['historia'],
        locale: 'es',
        seed: 1,
      },
      makeDeps({ llmClient: llm }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items.map((i) => i.iso2)).toContain('AR')
      expect(result.data.items.map((i) => i.iso2)).toContain('CL')
      expect(result.data.items.map((i) => i.iso2)).not.toContain('BR')
    }
  })
})

describe('generateAiPrompts — insufficient_grounding signal from LLM', () => {
  it('rerolls items that the model marks insufficient_grounding', async () => {
    let firstCall = true
    const llm: LlmClient = {
      generateRiddles: async (input) => {
        if (firstCall) {
          firstCall = false
          return {
            ok: true,
            data: {
              items: input.items.map((it) => ({
                kind: 'insufficient_grounding' as const,
                iso2: it.iso2,
                tag: it.tag,
              })),
            },
          }
        }
        return {
          ok: true,
          data: { items: input.items.map((it) => makeOkOutput(it.iso2, it.tag)) },
        }
      },
    }
    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: ['historia'], locale: 'es', seed: 1 },
      makeDeps({ llmClient: llm }),
    )
    expect(result.ok).toBe(true)
  })
})

describe('generateAiPrompts — INSUFFICIENT_GROUNDING_BATCH', () => {
  it('returns INSUFFICIENT_GROUNDING_BATCH when every item is rejected', async () => {
    const llm: LlmClient = createLlmClientFake({
      respond: (input) => ({
        items: input.items.map((it) => ({
          kind: 'insufficient_grounding',
          iso2: it.iso2,
          tag: it.tag,
        })),
      }),
    })
    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }, { iso2: 'BR' }], tags: [], locale: 'es', seed: 1 },
      makeDeps({ llmClient: llm }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INSUFFICIENT_GROUNDING_BATCH')
      expect(result.httpStatus).toBe(503)
    }
  })
})

describe('generateAiPrompts — Wikipedia unavailable', () => {
  it('returns LLM_UNAVAILABLE when grounding fails for every item', async () => {
    const llm: LlmClient = createLlmClientFake({
      respond: (input) => ({
        items: input.items.map((it) => makeOkOutput(it.iso2, it.tag)),
      }),
    })
    const grounding = makeGroundingClient({ ok: false, code: 'WIKIPEDIA_UNAVAILABLE' })
    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: [], locale: 'es', seed: 1 },
      makeDeps({ llmClient: llm, groundingClient: grounding }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('LLM_UNAVAILABLE')
    }
  })
})

describe('generateAiPrompts — tag selection determinism', () => {
  it('produces identical results for the same seed', async () => {
    const llm: LlmClient = createLlmClientFake({
      respond: (input) => ({
        items: input.items.map((it) => makeOkOutput(it.iso2, it.tag)),
      }),
    })
    const a = await generateAiPrompts(
      { items: [{ iso2: 'AR' }, { iso2: 'BR' }, { iso2: 'CL' }], tags: [], locale: 'es', seed: 1234 },
      makeDeps({ llmClient: llm }),
    )
    const b = await generateAiPrompts(
      { items: [{ iso2: 'AR' }, { iso2: 'BR' }, { iso2: 'CL' }], tags: [], locale: 'es', seed: 1234 },
      makeDeps({ llmClient: llm }),
    )
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) {
      expect(a.data.items.map((i) => i.tag)).toEqual(b.data.items.map((i) => i.tag))
    }
  })
})

describe('generateAiPrompts — tracer integration', () => {
  it('records each step (cache lookup, batch, validation outcome, summary) and flushes once', async () => {
    const llm: LlmClient = createLlmClientFake({
      respond: (input) => ({
        items: input.items.map((it) => makeOkOutput(it.iso2, it.tag)),
      }),
    })

    const calls: string[] = []
    const flushed = vi.fn(async () => undefined)
    const tracer = {
      requestId: 'fake-id',
      recordRequestStart: vi.fn(() => calls.push('request-start')),
      recordTagAssignment: vi.fn(() => calls.push('tag-assignment')),
      recordCacheLookup: vi.fn(() => calls.push('cache-lookup')),
      recordLlmBatch: vi.fn(() => calls.push('llm-batch')),
      recordItemOutcome: vi.fn(() => calls.push('item-outcome')),
      recordCircuitBreaker: vi.fn(),
      recordRequestEnd: vi.fn(() => calls.push('request-end')),
      flush: flushed,
    }

    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: ['historia'], locale: 'es', seed: 1 },
      makeDeps({ llmClient: llm, tracer }),
    )

    expect(result.ok).toBe(true)
    expect(tracer.recordRequestStart).toHaveBeenCalledTimes(1)
    expect(tracer.recordTagAssignment).toHaveBeenCalledTimes(1)
    expect(tracer.recordCacheLookup).toHaveBeenCalledTimes(1)
    expect(tracer.recordItemOutcome).toHaveBeenCalledTimes(1)
    expect(tracer.recordRequestEnd).toHaveBeenCalledTimes(1)
    expect(flushed).toHaveBeenCalledTimes(1)

    expect(calls).toEqual([
      'request-start',
      'tag-assignment',
      'cache-lookup',
      'item-outcome',
      'request-end',
    ])

    const requestStartArg = tracer.recordRequestStart.mock.calls[0]?.[0] as {
      locale: string
      iso2s: string[]
      tagsRequested: string[]
    }
    expect(requestStartArg.locale).toBe('es')
    expect(requestStartArg.iso2s).toEqual(['AR'])
    expect(requestStartArg.tagsRequested).toEqual(['historia'])

    const outcomeArg = tracer.recordItemOutcome.mock.calls[0]?.[0] as {
      kind: string
      iso2: string
    }
    expect(outcomeArg.kind).toBe('accepted')
    expect(outcomeArg.iso2).toBe('AR')
  })

  it('still flushes the tracer when the LLM returns a failure', async () => {
    const llm: LlmClient = {
      generateRiddles: async () => ({ ok: false, code: 'LLM_UNAVAILABLE' }),
    }
    const flush = vi.fn(async () => undefined)
    const tracer = {
      requestId: 'fake-id',
      recordRequestStart: vi.fn(),
      recordTagAssignment: vi.fn(),
      recordCacheLookup: vi.fn(),
      recordLlmBatch: vi.fn(),
      recordItemOutcome: vi.fn(),
      recordCircuitBreaker: vi.fn(),
      recordRequestEnd: vi.fn(),
      flush,
    }

    const result = await generateAiPrompts(
      { items: [{ iso2: 'AR' }], tags: ['historia'], locale: 'es', seed: 1 },
      makeDeps({ llmClient: llm, tracer }),
    )

    expect(result.ok).toBe(false)
    expect(flush).toHaveBeenCalledTimes(1)
  })
})
