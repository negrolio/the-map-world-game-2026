/**
 * Tracer **opcional** del modo AI trivia para inspección manual en desarrollo
 * local. Escribe **un archivo por request HTTP** con el detalle completo de
 * cada paso (cache, batches a Gemini, validaciones V1..V8, circuit breaker,
 * tokens y resumen final).
 *
 * Privacidad:
 *
 * - El tracer está **desactivado por defecto** y se niega a activarse si
 *   `VERCEL_ENV === 'production'`. Las reglas de `.cursor/rules/privacy.mdc`
 *   sobre no loguear cuerpos completos del proveedor LLM siguen valiendo en
 *   producción; este tracer es exclusivo para `vercel dev` / scripts locales.
 * - Se activa con `AI_TRIVIA_TRACE=1`. El directorio de salida es
 *   `./logs/ai-trivia/` salvo override con `AI_TRIVIA_TRACE_DIR`.
 * - El path va en `.gitignore` (`logs/` ya está ignorado).
 *
 * El módulo no impone overhead cuando la flag está apagada: el factory
 * `createAiTriviaTracerFromEnv` devuelve `undefined` y los call-sites usan
 * `tracer?.recordX(...)`.
 */
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { AppLocale } from '../../shared/app-locale.js'
import type { AiTriviaTagId } from '../../shared/ai-trivia-tags-schema.js'
import type {
  LlmAttemptNumber,
  LlmFailureCode,
  LlmGenerateOutputItem,
  LlmUsageInfo,
} from './prompts-deps.js'
import type { ValidationRuleCode } from './validate-ai-response.js'

const DEFAULT_TRACE_DIR = './logs/ai-trivia'

export interface TraceRequestStart {
  readonly locale: AppLocale
  readonly tagsRequested: readonly AiTriviaTagId[]
  readonly iso2s: readonly string[]
  readonly seed?: number
}

export interface TraceCacheLookup {
  readonly iso2: string
  readonly tag: AiTriviaTagId
  readonly locale: AppLocale
  readonly hit: boolean
}

export interface TraceTagAssignment {
  readonly iso2: string
  readonly tag: AiTriviaTagId
}

export interface TraceLlmBatch {
  readonly attempt: LlmAttemptNumber
  readonly requestedItems: ReadonlyArray<{
    readonly iso2: string
    readonly tag: AiTriviaTagId
  }>
  readonly systemInstruction: string
  readonly userInstruction: string
  readonly rawResponse: unknown
  readonly parsedItems?: readonly LlmGenerateOutputItem[]
  readonly usage?: LlmUsageInfo
  readonly failure?: LlmFailureCode
}

export type TraceItemOutcomeKind =
  | 'accepted'
  | 'rejected'
  | 'insufficient_grounding'
  | 'parse_error'
  | 'wikipedia_unavailable'

export interface TraceItemOutcome {
  readonly attempt: LlmAttemptNumber
  readonly iso2: string
  readonly tag: AiTriviaTagId
  readonly kind: TraceItemOutcomeKind
  readonly rule?: ValidationRuleCode | 'PARSE_ERROR' | 'WIKIPEDIA_UNAVAILABLE'
  readonly riddle?: string
  readonly claimedSourceTitle?: string
  readonly claimedSourceLocale?: AppLocale
  readonly willRequeue: boolean
}

export interface TraceCircuitBreaker {
  readonly attempt: LlmAttemptNumber
  readonly batchSize: number
  readonly failureRatio: number
}

export interface TraceRequestEnd {
  readonly requestedCount: number
  readonly returnedCount: number
  readonly droppedCount: number
}

export interface AiTriviaTracer {
  readonly requestId: string
  recordRequestStart(info: TraceRequestStart): void
  recordTagAssignment(items: readonly TraceTagAssignment[]): void
  recordCacheLookup(entry: TraceCacheLookup): void
  recordLlmBatch(event: TraceLlmBatch): void
  recordItemOutcome(outcome: TraceItemOutcome): void
  recordCircuitBreaker(info: TraceCircuitBreaker): void
  recordRequestEnd(info: TraceRequestEnd): void
  /** Escribe el archivo. Idempotente: solo escribe la primera vez. */
  flush(): Promise<void>
}

export interface CreateAiTriviaTracerOptions {
  readonly traceDir: string
  readonly now?: () => Date
  readonly randomId?: () => string
  readonly writeFileImpl?: typeof writeFile
  readonly mkdirImpl?: typeof mkdir
  readonly onWriteError?: (error: unknown, filePath: string) => void
}

/**
 * Devuelve un tracer real si `AI_TRIVIA_TRACE=1` y el entorno no es
 * producción; de lo contrario `undefined`. Pensado para llamarse una vez por
 * request HTTP, no globalmente.
 */
export function createAiTriviaTracerFromEnv(): AiTriviaTracer | undefined {
  if (process.env.AI_TRIVIA_TRACE !== '1') {
    return undefined
  }
  if (process.env.VERCEL_ENV === 'production') {
    return undefined
  }
  const dir = process.env.AI_TRIVIA_TRACE_DIR ?? DEFAULT_TRACE_DIR
  return createAiTriviaTracer({ traceDir: dir })
}

export function createAiTriviaTracer(
  options: CreateAiTriviaTracerOptions,
): AiTriviaTracer {
  const now = options.now ?? (() => new Date())
  const randomId =
    options.randomId ?? (() => randomBytes(3).toString('hex'))
  const writeFileImpl = options.writeFileImpl ?? writeFile
  const mkdirImpl = options.mkdirImpl ?? mkdir
  const onWriteError =
    options.onWriteError ??
    ((error, filePath) => {
      console.warn(
        `[ai-trivia-trace] failed to write ${filePath}: ${String(error)}`,
      )
    })

  const requestId = randomId()
  const startedAt = now()
  const lines: string[] = []
  let flushed = false

  let requestStart: TraceRequestStart | undefined
  const tagAssignments: TraceTagAssignment[] = []
  const cacheLookups: TraceCacheLookup[] = []
  const batches: TraceLlmBatch[] = []
  const outcomes: TraceItemOutcome[] = []
  const breakers: TraceCircuitBreaker[] = []
  let requestEnd: TraceRequestEnd | undefined

  return {
    requestId,
    recordRequestStart(info) {
      requestStart = info
    },
    recordTagAssignment(items) {
      tagAssignments.push(...items)
    },
    recordCacheLookup(entry) {
      cacheLookups.push(entry)
    },
    recordLlmBatch(event) {
      batches.push(event)
    },
    recordItemOutcome(outcome) {
      outcomes.push(outcome)
    },
    recordCircuitBreaker(info) {
      breakers.push(info)
    },
    recordRequestEnd(info) {
      requestEnd = info
    },
    async flush() {
      if (flushed) return
      flushed = true
      const finishedAt = now()
      const filePath = resolve(
        options.traceDir,
        `${formatFileTimestamp(startedAt)}_${requestId}.log`,
      )
      const content = renderTrace({
        requestId,
        startedAt,
        finishedAt,
        requestStart,
        tagAssignments,
        cacheLookups,
        batches,
        outcomes,
        breakers,
        requestEnd,
        extraLines: lines,
      })
      try {
        await mkdirImpl(options.traceDir, { recursive: true })
        await writeFileImpl(filePath, content, 'utf8')
      } catch (error) {
        onWriteError(error, filePath)
      }
    },
  }
}

interface RenderInput {
  readonly requestId: string
  readonly startedAt: Date
  readonly finishedAt: Date
  readonly requestStart: TraceRequestStart | undefined
  readonly tagAssignments: readonly TraceTagAssignment[]
  readonly cacheLookups: readonly TraceCacheLookup[]
  readonly batches: readonly TraceLlmBatch[]
  readonly outcomes: readonly TraceItemOutcome[]
  readonly breakers: readonly TraceCircuitBreaker[]
  readonly requestEnd: TraceRequestEnd | undefined
  readonly extraLines: readonly string[]
}

function renderTrace(input: RenderInput): string {
  const sections: string[] = []
  sections.push(renderHeader(input))
  if (input.tagAssignments.length > 0) {
    sections.push(renderTagAssignment(input.tagAssignments))
  }
  if (input.cacheLookups.length > 0) {
    sections.push(renderCacheLookups(input.cacheLookups))
  }
  const outcomesByAttempt = groupOutcomesByAttempt(input.outcomes)
  for (let i = 0; i < input.batches.length; i += 1) {
    const batch = input.batches[i]
    const attemptOutcomes = outcomesByAttempt.get(batch.attempt) ?? []
    sections.push(renderBatch(batch, attemptOutcomes))
  }
  if (input.breakers.length > 0) {
    sections.push(renderBreakers(input.breakers))
  }
  sections.push(renderSummary(input))
  if (input.extraLines.length > 0) {
    sections.push(input.extraLines.join('\n'))
  }
  return `${sections.join('\n\n')}\n`
}

function renderHeader(input: RenderInput): string {
  const lines: string[] = []
  lines.push(bigDivider())
  lines.push('AI Trivia request trace')
  lines.push(bigDivider())
  lines.push(`Request ID: ${input.requestId}`)
  lines.push(`Started:    ${input.startedAt.toISOString()}`)
  lines.push(`Finished:   ${input.finishedAt.toISOString()}`)
  lines.push(`Duration:   ${formatDuration(input.startedAt, input.finishedAt)}`)
  if (input.requestStart) {
    const { locale, tagsRequested, iso2s, seed } = input.requestStart
    lines.push(`Locale:     ${locale}`)
    lines.push(
      `Tags:       ${tagsRequested.length === 0 ? '(any)' : tagsRequested.join(', ')}`,
    )
    lines.push(
      `Pool ISO2:  ${iso2s.join(', ')} (${String(iso2s.length)} item${iso2s.length === 1 ? '' : 's'})`,
    )
    if (typeof seed === 'number') {
      lines.push(`Seed:       ${String(seed)}`)
    }
  }
  return lines.join('\n')
}

function renderTagAssignment(items: readonly TraceTagAssignment[]): string {
  const lines: string[] = []
  lines.push(smallDivider())
  lines.push('Tag assignment')
  lines.push(smallDivider())
  const isoWidth = maxWidth(items.map((item) => item.iso2))
  for (const item of items) {
    lines.push(`  ${item.iso2.padEnd(isoWidth)} -> ${item.tag}`)
  }
  return lines.join('\n')
}

function renderCacheLookups(entries: readonly TraceCacheLookup[]): string {
  const lines: string[] = []
  lines.push(smallDivider())
  lines.push('Cache lookup')
  lines.push(smallDivider())
  const isoWidth = maxWidth(entries.map((entry) => entry.iso2))
  const tagWidth = maxWidth(entries.map((entry) => entry.tag))
  let hits = 0
  let misses = 0
  for (const entry of entries) {
    const status = entry.hit ? 'HIT ' : 'MISS'
    if (entry.hit) hits += 1
    else misses += 1
    lines.push(
      `  ${status}  ${entry.iso2.padEnd(isoWidth)} | ${entry.tag.padEnd(tagWidth)} | ${entry.locale}`,
    )
  }
  lines.push(
    `  (${String(hits)} hit${hits === 1 ? '' : 's'}, ${String(misses)} miss${misses === 1 ? '' : 'es'})`,
  )
  return lines.join('\n')
}

function renderBatch(
  batch: TraceLlmBatch,
  outcomes: readonly TraceItemOutcome[],
): string {
  const lines: string[] = []
  lines.push(bigDivider())
  lines.push(
    `LLM batch (attempt ${String(batch.attempt)}, ${String(batch.requestedItems.length)} item${batch.requestedItems.length === 1 ? '' : 's'})`,
  )
  lines.push(bigDivider())

  lines.push('[Prompt]')
  lines.push('--- system ---')
  lines.push(batch.systemInstruction.trim())
  lines.push('--- user ---')
  lines.push(batch.userInstruction.trim())

  lines.push('')
  lines.push('[Response]')
  if (batch.failure) {
    lines.push(`  failure: ${batch.failure}`)
  } else {
    lines.push('  tokens:')
    lines.push(`    prompt:     ${formatTokenCount(batch.usage?.promptTokens)}`)
    lines.push(
      `    completion: ${formatTokenCount(batch.usage?.completionTokens)}`,
    )
    lines.push(`    total:      ${formatTokenCount(batch.usage?.totalTokens)}`)
    lines.push('  parsed items:')
    if (!batch.parsedItems || batch.parsedItems.length === 0) {
      lines.push('    (none)')
    } else {
      for (const item of batch.parsedItems) {
        lines.push(`    - ${formatParsedItem(item)}`)
      }
    }
  }

  lines.push('')
  lines.push('[Validation]')
  if (outcomes.length === 0) {
    lines.push('  (no validation outcomes for this batch)')
  } else {
    for (const outcome of outcomes) {
      lines.push(`  ${formatOutcomeLine(outcome)}`)
    }
  }

  return lines.join('\n')
}

function renderBreakers(breakers: readonly TraceCircuitBreaker[]): string {
  const lines: string[] = []
  lines.push(smallDivider())
  lines.push('Circuit breaker')
  lines.push(smallDivider())
  for (const breaker of breakers) {
    lines.push(
      `  triggered: attempt=${String(breaker.attempt)} batchSize=${String(breaker.batchSize)} failureRatio=${breaker.failureRatio.toFixed(2)}`,
    )
  }
  return lines.join('\n')
}

function renderSummary(input: RenderInput): string {
  const lines: string[] = []
  lines.push(bigDivider())
  lines.push('Summary')
  lines.push(bigDivider())
  const requested = input.requestEnd?.requestedCount
  const returned = input.requestEnd?.returnedCount
  const dropped = input.requestEnd?.droppedCount
  lines.push(`Items requested:  ${formatCount(requested)}`)
  lines.push(`Items returned:   ${formatCount(returned)}`)
  lines.push(`Items dropped:    ${formatCount(dropped)}`)
  const cacheHits = input.cacheLookups.filter((entry) => entry.hit).length
  const cacheMisses = input.cacheLookups.length - cacheHits
  lines.push(`Cache hits:       ${String(cacheHits)}`)
  lines.push(`Cache misses:     ${String(cacheMisses)}`)
  lines.push(`LLM batches:      ${String(input.batches.length)}`)
  const totals = sumUsage(input.batches)
  lines.push('LLM tokens (sum):')
  lines.push(`  prompt:     ${formatTokenCount(totals.promptTokens)}`)
  lines.push(`  completion: ${formatTokenCount(totals.completionTokens)}`)
  lines.push(`  total:      ${formatTokenCount(totals.totalTokens)}`)
  lines.push(
    `Duration:         ${formatDuration(input.startedAt, input.finishedAt)}`,
  )
  return lines.join('\n')
}

function groupOutcomesByAttempt(
  outcomes: readonly TraceItemOutcome[],
): Map<LlmAttemptNumber, TraceItemOutcome[]> {
  const map = new Map<LlmAttemptNumber, TraceItemOutcome[]>()
  for (const outcome of outcomes) {
    const list = map.get(outcome.attempt) ?? []
    list.push(outcome)
    map.set(outcome.attempt, list)
  }
  return map
}

function sumUsage(batches: readonly TraceLlmBatch[]): {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
} {
  let prompt: number | undefined
  let completion: number | undefined
  let total: number | undefined
  for (const batch of batches) {
    if (!batch.usage) continue
    prompt = (prompt ?? 0) + (batch.usage.promptTokens ?? 0)
    completion = (completion ?? 0) + (batch.usage.completionTokens ?? 0)
    total = (total ?? 0) + (batch.usage.totalTokens ?? 0)
  }
  return { promptTokens: prompt, completionTokens: completion, totalTokens: total }
}

function formatOutcomeLine(outcome: TraceItemOutcome): string {
  const base = `${outcome.iso2.padEnd(2)} | ${outcome.tag.padEnd(10)}`
  switch (outcome.kind) {
    case 'accepted':
      return `${base} | ACCEPTED${formatRiddleSuffix(outcome)}`
    case 'rejected':
      return `${base} | REJECTED ${outcome.rule ?? '(unknown)'}${
        outcome.willRequeue ? ' -> requeue' : ' -> dropped'
      }${formatRiddleSuffix(outcome)}`
    case 'insufficient_grounding':
      return `${base} | LLM_INSUFFICIENT_GROUNDING${
        outcome.willRequeue ? ' -> requeue' : ' -> dropped'
      }`
    case 'parse_error':
      return `${base} | PARSE_ERROR${
        outcome.willRequeue ? ' -> requeue' : ' -> dropped'
      }`
    case 'wikipedia_unavailable':
      return `${base} | WIKIPEDIA_UNAVAILABLE${
        outcome.willRequeue ? ' -> requeue' : ' -> dropped'
      }`
  }
}

function formatRiddleSuffix(outcome: TraceItemOutcome): string {
  if (!outcome.riddle && !outcome.claimedSourceTitle) return ''
  const parts: string[] = []
  if (outcome.riddle) parts.push(`riddle="${truncate(outcome.riddle, 160)}"`)
  if (outcome.claimedSourceTitle) {
    parts.push(
      `source="${outcome.claimedSourceTitle}"${outcome.claimedSourceLocale ? ` (${outcome.claimedSourceLocale})` : ''}`,
    )
  }
  return ` ${parts.join(' ')}`
}

function formatParsedItem(item: LlmGenerateOutputItem): string {
  if (item.kind === 'insufficient_grounding') {
    return `${item.iso2} | ${item.tag.padEnd(10)} | insufficient_grounding`
  }
  return `${item.iso2} | ${item.tag.padEnd(10)} | ok            riddle="${truncate(item.riddle, 160)}" source="${item.claimedSourceTitle}" (${item.claimedSourceLocale}) difficulty=${item.difficulty} valid=${String(item.valid)}`
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

function maxWidth(values: readonly string[]): number {
  let max = 0
  for (const value of values) {
    if (value.length > max) max = value.length
  }
  return max
}

function formatTokenCount(value: number | undefined): string {
  return value === undefined ? '(unknown)' : String(value)
}

function formatCount(value: number | undefined): string {
  return value === undefined ? '(unknown)' : String(value)
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime()
  return `${String(ms)} ms`
}

function formatFileTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

function bigDivider(): string {
  return '='.repeat(80)
}

function smallDivider(): string {
  return '-'.repeat(80)
}
