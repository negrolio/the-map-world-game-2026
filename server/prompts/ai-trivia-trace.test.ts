import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAiTriviaTracer,
  createAiTriviaTracerFromEnv,
} from './ai-trivia-trace.js'

interface CapturedWrite {
  readonly filePath: string
  readonly content: string
}

function makeWriter(): {
  readonly captured: CapturedWrite[]
  readonly mkdirImpl: (path: string) => Promise<void>
  readonly writeFileImpl: (path: string, content: string) => Promise<void>
} {
  const captured: CapturedWrite[] = []
  return {
    captured,
    mkdirImpl: async () => undefined,
    writeFileImpl: async (path, content) => {
      captured.push({
        filePath: typeof path === 'string' ? path : String(path),
        content: typeof content === 'string' ? content : String(content),
      })
    },
  }
}

describe('createAiTriviaTracerFromEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.AI_TRIVIA_TRACE
    delete process.env.AI_TRIVIA_TRACE_DIR
    delete process.env.VERCEL_ENV
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns undefined when AI_TRIVIA_TRACE is not 1', () => {
    expect(createAiTriviaTracerFromEnv()).toBeUndefined()
    process.env.AI_TRIVIA_TRACE = '0'
    expect(createAiTriviaTracerFromEnv()).toBeUndefined()
  })

  it('returns undefined in production even with the flag on', () => {
    process.env.AI_TRIVIA_TRACE = '1'
    process.env.VERCEL_ENV = 'production'
    expect(createAiTriviaTracerFromEnv()).toBeUndefined()
  })

  it('returns a tracer when the flag is enabled outside production', () => {
    process.env.AI_TRIVIA_TRACE = '1'
    process.env.VERCEL_ENV = 'preview'
    expect(createAiTriviaTracerFromEnv()).toBeDefined()
  })
})

describe('createAiTriviaTracer — file output', () => {
  it('writes a single file with header, sections and summary', async () => {
    const writer = makeWriter()
    const now = vi
      .fn<() => Date>()
      .mockReturnValueOnce(new Date('2026-05-22T22:57:00.000Z'))
      .mockReturnValueOnce(new Date('2026-05-22T22:57:02.500Z'))

    const tracer = createAiTriviaTracer({
      traceDir: '/tmp/ai-trivia',
      now,
      randomId: () => 'abc123',
      mkdirImpl: writer.mkdirImpl,
      writeFileImpl: writer.writeFileImpl,
    })

    tracer.recordRequestStart({
      locale: 'es',
      tagsRequested: ['historia'],
      iso2s: ['AR', 'FR'],
      seed: 42,
    })
    tracer.recordTagAssignment([
      { iso2: 'AR', tag: 'historia' },
      { iso2: 'FR', tag: 'historia' },
    ])
    tracer.recordCacheLookup({ iso2: 'AR', tag: 'historia', locale: 'es', hit: true })
    tracer.recordCacheLookup({ iso2: 'FR', tag: 'historia', locale: 'es', hit: false })
    tracer.recordLlmBatch({
      attempt: 1,
      requestedItems: [{ iso2: 'FR', tag: 'historia' }],
      systemInstruction: 'system rules',
      userInstruction: 'list of items',
      rawResponse: { candidates: [] },
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      parsedItems: [],
    })
    tracer.recordItemOutcome({
      attempt: 1,
      iso2: 'FR',
      tag: 'historia',
      kind: 'accepted',
      riddle: '¿Qué país elaboró su carta magna en 1789?',
      claimedSourceTitle: 'Declaración de los Derechos del Hombre y del Ciudadano',
      claimedSourceLocale: 'es',
      willRequeue: false,
    })
    tracer.recordRequestEnd({ requestedCount: 2, returnedCount: 2, droppedCount: 0 })

    await tracer.flush()

    expect(writer.captured.length).toBe(1)
    const { filePath, content } = writer.captured[0]
    expect(filePath).toContain('/tmp/ai-trivia')
    expect(filePath).toContain('abc123.log')
    expect(content).toContain('AI Trivia request trace')
    expect(content).toContain('Locale:     es')
    expect(content).toContain('Tags:       historia')
    expect(content).toContain('Pool ISO2:  AR, FR (2 items)')
    expect(content).toContain('Seed:       42')
    expect(content).toContain('HIT   AR | historia | es')
    expect(content).toContain('MISS  FR | historia | es')
    expect(content).toContain('(1 hit, 1 miss)')
    expect(content).toContain('LLM batch (attempt 1, 1 item)')
    expect(content).toContain('--- system ---')
    expect(content).toContain('system rules')
    expect(content).toContain('--- user ---')
    expect(content).toContain('list of items')
    expect(content).toContain('prompt:     100')
    expect(content).toContain('completion: 200')
    expect(content).toContain('total:      300')
    expect(content).toContain('FR | historia   | ACCEPTED')
    expect(content).toContain('Summary')
    expect(content).toContain('Items requested:  2')
    expect(content).toContain('Items returned:   2')
    expect(content).toContain('Duration:         2500 ms')
  })

  it('aggregates tokens across multiple batches in the summary', async () => {
    const writer = makeWriter()
    const tracer = createAiTriviaTracer({
      traceDir: '/tmp/x',
      now: () => new Date('2026-05-22T00:00:00.000Z'),
      randomId: () => 'sum01',
      mkdirImpl: writer.mkdirImpl,
      writeFileImpl: writer.writeFileImpl,
    })

    tracer.recordRequestStart({ locale: 'es', tagsRequested: [], iso2s: ['AR'] })
    tracer.recordLlmBatch({
      attempt: 1,
      requestedItems: [{ iso2: 'AR', tag: 'historia' }],
      systemInstruction: 'sys',
      userInstruction: 'usr',
      rawResponse: {},
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    })
    tracer.recordLlmBatch({
      attempt: 2,
      requestedItems: [{ iso2: 'AR', tag: 'historia' }],
      systemInstruction: 'sys',
      userInstruction: 'usr',
      rawResponse: {},
      usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 },
    })
    tracer.recordRequestEnd({ requestedCount: 1, returnedCount: 1, droppedCount: 0 })

    await tracer.flush()

    const { content } = writer.captured[0]
    expect(content).toContain('LLM tokens (sum):')
    expect(content).toContain('prompt:     25')
    expect(content).toContain('completion: 45')
    expect(content).toContain('total:      70')
  })

  it('reports failure code when a batch fails and shows (unknown) tokens', async () => {
    const writer = makeWriter()
    const tracer = createAiTriviaTracer({
      traceDir: '/tmp/x',
      now: () => new Date('2026-05-22T00:00:00.000Z'),
      randomId: () => 'fail01',
      mkdirImpl: writer.mkdirImpl,
      writeFileImpl: writer.writeFileImpl,
    })

    tracer.recordLlmBatch({
      attempt: 1,
      requestedItems: [{ iso2: 'AR', tag: 'historia' }],
      systemInstruction: 'sys',
      userInstruction: 'usr',
      rawResponse: { error: 'rate limited' },
      failure: 'LLM_RATE_LIMITED',
    })

    await tracer.flush()

    const { content } = writer.captured[0]
    expect(content).toContain('failure: LLM_RATE_LIMITED')
    expect(content).toContain('LLM tokens (sum):')
    expect(content).toContain('prompt:     (unknown)')
  })

  it('is idempotent: flush twice writes only once', async () => {
    const writer = makeWriter()
    const tracer = createAiTriviaTracer({
      traceDir: '/tmp/x',
      now: () => new Date('2026-05-22T00:00:00.000Z'),
      randomId: () => 'idem01',
      mkdirImpl: writer.mkdirImpl,
      writeFileImpl: writer.writeFileImpl,
    })
    tracer.recordRequestStart({ locale: 'es', tagsRequested: [], iso2s: ['AR'] })
    tracer.recordRequestEnd({ requestedCount: 1, returnedCount: 1, droppedCount: 0 })

    await tracer.flush()
    await tracer.flush()

    expect(writer.captured.length).toBe(1)
  })

  it('does not throw when the writer fails (warns instead)', async () => {
    const errorHandler = vi.fn()
    const tracer = createAiTriviaTracer({
      traceDir: '/tmp/x',
      now: () => new Date('2026-05-22T00:00:00.000Z'),
      randomId: () => 'err01',
      mkdirImpl: async () => undefined,
      writeFileImpl: async () => {
        throw new Error('disk full')
      },
      onWriteError: errorHandler,
    })
    tracer.recordRequestEnd({ requestedCount: 0, returnedCount: 0, droppedCount: 0 })

    await expect(tracer.flush()).resolves.toBeUndefined()
    expect(errorHandler).toHaveBeenCalledTimes(1)
  })
})
