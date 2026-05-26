import type { AppLocale } from '../../shared/app-locale.js'
import {
  aiPromptsFailure,
  type AiPromptItem,
  type AiPromptSource,
  type AiPromptsFailure,
  type AiPromptsResult,
} from '../../shared/ai-trivia-api.js'
import {
  AI_TRIVIA_VALIDATION_VERSION,
  CIRCUIT_BREAKER_MIN_ITEMS,
  CIRCUIT_BREAKER_RATIO,
  MAX_REROLLS,
} from './ai-trivia-constants.js'
import {
  incrementValidationFailure,
  recordBatchResult,
  recordCacheHitL1,
  recordCacheHitL2,
  recordCacheMiss,
  recordConvexError,
} from './ai-trivia-logger.js'
import type { AiTriviaTracer } from './ai-trivia-trace.js'
import type {
  GenerateAiPromptsDeps,
  LlmAttemptNumber,
  LlmBatchDebug,
  LlmGenerateInputItem,
  LlmGenerateOutputItem,
  LlmRerollContextEntry,
  WikipediaGroundingResult,
} from './prompts-deps.js'
import type { StoredRiddle, StoredRiddleSource } from './riddle-repository.js'
import {
  assignTagsToItems,
  createSeededRandom,
  type ItemWithTag,
} from './tag-picker.js'
import {
  validateAiPromptsRequest,
  type ValidatedAiPromptsRequest,
} from './validate-ai-prompts-request.js'
import {
  validateAiResponseItem,
  type ValidationRuleCode,
} from './validate-ai-response.js'

interface PendingItem {
  readonly iso2: string
  readonly tag: ItemWithTag['tag']
  readonly originalIndex: number
}

export async function generateAiPrompts(
  rawRequest: unknown,
  deps: GenerateAiPromptsDeps,
): Promise<AiPromptsResult> {
  const validated = validateAiPromptsRequest(rawRequest)
  if (!validated.ok) {
    return validated.failure
  }
  const request = validated.data
  const tracer = deps.tracer

  try {
    tracer?.recordRequestStart({
      locale: request.locale,
      tagsRequested: request.tags,
      iso2s: request.items.map((item) => item.iso2),
      seed: request.seed,
    })

    const random =
      request.seed !== undefined ? createSeededRandom(request.seed) : deps.random
    const itemsWithTags = assignTagsToItems({
      items: request.items,
      selectedTags: request.tags,
      random,
    })

    tracer?.recordTagAssignment(
      itemsWithTags.map((entry) => ({ iso2: entry.iso2, tag: entry.tag })),
    )

    const responseSlots: (AiPromptItem | undefined)[] = new Array(
      itemsWithTags.length,
    ).fill(undefined)
    const cacheMisses: PendingItem[] = []

    for (let i = 0; i < itemsWithTags.length; i += 1) {
      const entry = itemsWithTags[i]
      const outcome = await deps.riddleRepository.findRandomVariant({
        iso2: entry.iso2,
        tag: entry.tag,
        locale: request.locale,
        excludedIds: request.excludedIds,
        random,
      })
      if (outcome.kind === 'unavailable') {
        recordConvexError('lookup', entry.iso2, entry.tag, request.locale)
        tracer?.recordCacheLookup({
          iso2: entry.iso2,
          tag: entry.tag,
          locale: request.locale,
          hit: false,
        })
        return aiPromptsFailure(
          'CONVEX_UNAVAILABLE',
          'Riddle storage is currently unavailable',
        )
      }
      tracer?.recordCacheLookup({
        iso2: entry.iso2,
        tag: entry.tag,
        locale: request.locale,
        hit: outcome.kind === 'hit',
      })
      if (outcome.kind === 'hit') {
        if (outcome.layer === 'l1') {
          recordCacheHitL1(entry.iso2, entry.tag, request.locale)
        } else {
          recordCacheHitL2(entry.iso2, entry.tag, request.locale)
        }
        responseSlots[i] = storedRiddleToApiItem(outcome.riddle)
        continue
      }
      recordCacheMiss(entry.iso2, entry.tag, request.locale)
      cacheMisses.push({ iso2: entry.iso2, tag: entry.tag, originalIndex: i })
    }

    let llmFailure: AiPromptsFailure | undefined
    if (cacheMisses.length > 0) {
      const llmOutcome = await processWithRerolls(cacheMisses, request, deps)
      if (!llmOutcome.ok) {
        llmFailure = llmOutcome.failure
      } else {
        for (const valid of llmOutcome.valid) {
          const entry = itemsWithTags[valid.index]
          try {
            const stored = await deps.riddleRepository.save({
              iso2: entry.iso2,
              tag: entry.tag,
              locale: request.locale,
              riddle: valid.output.riddle.trim(),
              source: buildStoredSource(valid.output),
              difficulty: valid.output.difficulty,
              justification: valid.output.justification,
              llmProvider: deps.llmProviderId,
              validationVersion: AI_TRIVIA_VALIDATION_VERSION,
              createdAt: deps.now(),
            })
            responseSlots[valid.index] = storedRiddleToApiItem(stored)
          } catch {
            recordConvexError('save', entry.iso2, entry.tag, request.locale)
            llmFailure = aiPromptsFailure(
              'CONVEX_UNAVAILABLE',
              'Riddle storage is currently unavailable',
            )
            break
          }
        }
      }
    }

    const responseItems = responseSlots.filter(
      (item): item is AiPromptItem => item !== undefined,
    )

    recordBatchResult(request.locale, itemsWithTags.length, responseItems.length)

    tracer?.recordRequestEnd({
      requestedCount: itemsWithTags.length,
      returnedCount: responseItems.length,
      droppedCount: itemsWithTags.length - responseItems.length,
    })

    if (llmFailure) {
      return llmFailure
    }

    if (responseItems.length === 0) {
      return aiPromptsFailure(
        'INSUFFICIENT_GROUNDING_BATCH',
        'No valid AI prompts could be generated for this batch',
      )
    }

    return { ok: true, data: { items: responseItems } }
  } finally {
    if (tracer) {
      await tracer.flush()
    }
  }
}

interface ValidLlmOutput {
  readonly index: number
  readonly output: Extract<LlmGenerateOutputItem, { kind: 'ok' }>
}

interface ProcessWithRerollsSuccess {
  readonly ok: true
  readonly valid: readonly ValidLlmOutput[]
}
interface ProcessWithRerollsFailure {
  readonly ok: false
  readonly failure: AiPromptsFailure
}

async function processWithRerolls(
  initialPending: readonly PendingItem[],
  request: ValidatedAiPromptsRequest,
  deps: GenerateAiPromptsDeps,
): Promise<ProcessWithRerollsSuccess | ProcessWithRerollsFailure> {
  const tracer = deps.tracer
  const validResults: ValidLlmOutput[] = []
  let pending = [...initialPending]
  let attempt: LlmAttemptNumber = 1
  let lastRerollContext: readonly LlmRerollContextEntry[] = []
  const groundingMemo = new Map<string, WikipediaGroundingResult>()
  let sawWikipediaUnavailable = false

  while (pending.length > 0 && attempt <= MAX_REROLLS + 1) {
    const llmInput: LlmGenerateInputItem[] = pending.map((p) => ({ iso2: p.iso2, tag: p.tag }))
    const currentAttempt = attempt
    const llmResult = await deps.llmClient.generateRiddles({
      items: llmInput,
      locale: request.locale,
      attempt: currentAttempt,
      rerollContext: currentAttempt === 1 ? undefined : lastRerollContext,
      onBatchDebug: tracer
        ? buildBatchDebugCallback(tracer, currentAttempt, llmInput)
        : undefined,
    })

    if (!llmResult.ok) {
      return {
        ok: false,
        failure: aiPromptsFailure(llmResult.code, llmResult.code),
      }
    }

    const outcome = await partitionLlmOutput(
      pending,
      llmResult.data.items,
      request.locale,
      currentAttempt,
      deps,
      groundingMemo,
    )
    validResults.push(...outcome.valid)
    if (outcome.wikipediaUnavailable) {
      sawWikipediaUnavailable = true
    }
    const failureCount = outcome.pending.length
    const failureRatio = failureCount / pending.length
    const batchSize = pending.length
    pending = outcome.pending.map((p) => ({ ...p }))
    lastRerollContext = outcome.failedRules

    if (
      batchSize >= CIRCUIT_BREAKER_MIN_ITEMS &&
      failureRatio > CIRCUIT_BREAKER_RATIO &&
      currentAttempt >= 1
    ) {
      tracer?.recordCircuitBreaker({
        attempt: currentAttempt,
        batchSize,
        failureRatio,
      })
      break
    }

    attempt = (attempt + 1) as LlmAttemptNumber
  }

  if (validResults.length === 0 && sawWikipediaUnavailable) {
    return {
      ok: false,
      failure: aiPromptsFailure(
        'LLM_UNAVAILABLE',
        'Wikipedia grounding is currently unavailable',
      ),
    }
  }

  return { ok: true, valid: validResults }
}

function buildBatchDebugCallback(
  tracer: AiTriviaTracer,
  attempt: LlmAttemptNumber,
  requestedItems: readonly LlmGenerateInputItem[],
): (debug: LlmBatchDebug) => void {
  return (debug) => {
    tracer.recordLlmBatch({
      attempt,
      requestedItems,
      systemInstruction: debug.systemInstruction,
      userInstruction: debug.userInstruction,
      rawResponse: debug.rawResponse,
      parsedItems: debug.parsedItems,
      usage: debug.usage,
      failure: debug.failure,
    })
  }
}

interface PartitionResult {
  readonly valid: readonly ValidLlmOutput[]
  readonly pending: readonly PendingItem[]
  readonly failedRules: readonly LlmRerollContextEntry[]
  readonly wikipediaUnavailable: boolean
}

async function partitionLlmOutput(
  pending: readonly PendingItem[],
  outputs: readonly LlmGenerateOutputItem[],
  locale: AppLocale,
  attempt: LlmAttemptNumber,
  deps: GenerateAiPromptsDeps,
  groundingMemo: Map<string, WikipediaGroundingResult>,
): Promise<PartitionResult> {
  const tracer = deps.tracer
  const outputByKey = new Map<string, LlmGenerateOutputItem>()
  for (const out of outputs) {
    outputByKey.set(`${out.iso2.toUpperCase()}|${out.tag}`, out)
  }

  const valid: ValidLlmOutput[] = []
  const nextPending: PendingItem[] = []
  const failedRules: LlmRerollContextEntry[] = []
  let wikipediaUnavailable = false
  const willRequeue = attempt < (MAX_REROLLS + 1)

  for (const entry of pending) {
    const key = `${entry.iso2.toUpperCase()}|${entry.tag}`
    const output = outputByKey.get(key)
    if (!output) {
      incrementValidationFailure('PARSE_ERROR', entry.iso2, entry.tag, locale)
      failedRules.push({ iso2: entry.iso2, tag: entry.tag, failedRule: 'PARSE_ERROR' })
      nextPending.push(entry)
      tracer?.recordItemOutcome({
        attempt,
        iso2: entry.iso2,
        tag: entry.tag,
        kind: 'parse_error',
        rule: 'PARSE_ERROR',
        willRequeue,
      })
      continue
    }
    if (output.kind === 'insufficient_grounding') {
      incrementValidationFailure(
        'V5_ARTICLE_MISSING',
        entry.iso2,
        entry.tag,
        locale,
      )
      nextPending.push(entry)
      failedRules.push({
        iso2: entry.iso2,
        tag: entry.tag,
        failedRule: 'V5_ARTICLE_MISSING',
      })
      tracer?.recordItemOutcome({
        attempt,
        iso2: entry.iso2,
        tag: entry.tag,
        kind: 'insufficient_grounding',
        rule: 'V5_ARTICLE_MISSING',
        willRequeue,
      })
      continue
    }

    const validation = await validateAiResponseItem(
      { requestIso2: entry.iso2, locale, item: output },
      { groundingClient: deps.groundingClient, groundingMemo },
    )
    if (validation.ok) {
      valid.push({ index: entry.originalIndex, output })
      tracer?.recordItemOutcome({
        attempt,
        iso2: entry.iso2,
        tag: entry.tag,
        kind: 'accepted',
        riddle: output.riddle,
        claimedSourceTitle: output.claimedSourceTitle,
        claimedSourceLocale: output.claimedSourceLocale,
        willRequeue: false,
      })
      continue
    }
    if (validation.rule === 'WIKIPEDIA_UNAVAILABLE') {
      wikipediaUnavailable = true
      nextPending.push(entry)
      tracer?.recordItemOutcome({
        attempt,
        iso2: entry.iso2,
        tag: entry.tag,
        kind: 'wikipedia_unavailable',
        rule: 'WIKIPEDIA_UNAVAILABLE',
        riddle: output.riddle,
        claimedSourceTitle: output.claimedSourceTitle,
        claimedSourceLocale: output.claimedSourceLocale,
        willRequeue,
      })
      continue
    }
    incrementValidationFailure(validation.rule, entry.iso2, entry.tag, locale)
    failedRules.push({
      iso2: entry.iso2,
      tag: entry.tag,
      failedRule: validation.rule as ValidationRuleCode,
    })
    nextPending.push(entry)
    tracer?.recordItemOutcome({
      attempt,
      iso2: entry.iso2,
      tag: entry.tag,
      kind: 'rejected',
      rule: validation.rule as ValidationRuleCode,
      riddle: output.riddle,
      claimedSourceTitle: output.claimedSourceTitle,
      claimedSourceLocale: output.claimedSourceLocale,
      willRequeue,
    })
  }

  return {
    valid,
    pending: nextPending,
    failedRules,
    wikipediaUnavailable,
  }
}

function buildStoredSource(
  output: Extract<LlmGenerateOutputItem, { kind: 'ok' }>,
): StoredRiddleSource {
  const titleEncoded = encodeURIComponent(output.claimedSourceTitle.replace(/ /g, '_'))
  const url = `https://${output.claimedSourceLocale}.wikipedia.org/wiki/${titleEncoded}`
  return {
    origin: 'wikipedia',
    url,
    title: output.claimedSourceTitle,
    locale: output.claimedSourceLocale,
  }
}

function storedRiddleToApiItem(stored: StoredRiddle): AiPromptItem {
  const source: AiPromptSource = {
    title: stored.source.title,
    locale: stored.source.locale,
    url: stored.source.url,
  }
  return {
    riddleId: stored.id,
    iso2: stored.iso2.toUpperCase(),
    tag: stored.tag,
    riddle: stored.riddle,
    difficulty: stored.difficulty,
    source,
  }
}
