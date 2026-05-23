import type { AppLocale } from '../../shared/app-locale.js'
import { isAppLocale } from '../../shared/app-locale.js'
import {
  isAiTriviaTagId,
  type AiTriviaTagId,
} from '../../shared/ai-trivia-tags-schema.js'
import type { AiPromptDifficulty } from '../../shared/ai-trivia-api.js'
import { recordLlmRequest } from './ai-trivia-logger.js'
import { buildPrompt } from './prompt-blueprint.js'
import type {
  LlmBatchDebug,
  LlmClient,
  LlmGenerateInput,
  LlmGenerateOutput,
  LlmGenerateOutputItem,
  LlmGenerateResult,
  LlmUsageInfo,
} from './prompts-deps.js'

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com'
const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
const DEFAULT_TIMEOUT_MS = 15_000
const NETWORK_RETRY_COUNT = 1

export interface CreateLlmClientGeminiOptions {
  readonly apiKey?: string
  readonly fetchImpl?: typeof fetch
  readonly timeoutMs?: number
  readonly model?: string
  readonly baseUrl?: string
}

/**
 * Implementación REST de `LlmClient` apuntando a Gemini (por defecto
 * `gemini-3.1-flash-lite`, el modelo más barato de la familia Gemini 3 para
 * texto). Si no hay `apiKey` (ni opcional ni en env), devuelve siempre
 * `LLM_UNAVAILABLE` sin romper el bootstrap. Mantiene el contrato del
 * adaptador para no acoplar el resto del backend al proveedor.
 */
export function createLlmClientGemini(
  options: CreateLlmClientGeminiOptions = {},
): LlmClient {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? ''
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const model = options.model ?? DEFAULT_MODEL
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL

  if (apiKey === '') {
    return {
      generateRiddles: async () => ({ ok: false, code: 'LLM_UNAVAILABLE' }),
    }
  }

  return {
    generateRiddles: (input) =>
      generateImpl(input, { apiKey, fetchImpl, timeoutMs, model, baseUrl }),
  }
}

interface GenerateConfig {
  readonly apiKey: string
  readonly fetchImpl: typeof fetch
  readonly timeoutMs: number
  readonly model: string
  readonly baseUrl: string
}

async function generateImpl(
  input: LlmGenerateInput,
  config: GenerateConfig,
): Promise<LlmGenerateResult> {
  recordLlmRequest(input.locale, input.items.length, input.attempt)
  const built = buildPrompt({
    locale: input.locale,
    attempt: input.attempt,
    items: input.items,
    rerollContext: input.rerollContext,
  })

  const url = `${config.baseUrl}/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`

  const body = {
    systemInstruction: { parts: [{ text: built.systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: built.userInstruction }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: built.responseSchema,
      temperature: 0.4,
    },
  }

  let attempt = 0
  while (true) {
    const { result, rawResponse, usage } = await singleRequest(url, body, config)
    emitBatchDebug(input, built, result, rawResponse, usage)
    if (result.ok || result.code === 'LLM_RATE_LIMITED') {
      return result
    }
    attempt += 1
    if (attempt > NETWORK_RETRY_COUNT) {
      return result
    }
  }
}

interface SingleRequestOutcome {
  readonly result: LlmGenerateResult
  readonly rawResponse: unknown
  readonly usage?: LlmUsageInfo
}

async function singleRequest(
  url: string,
  body: unknown,
  config: GenerateConfig,
): Promise<SingleRequestOutcome> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = await config.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (response.status === 429) {
      const raw = (await response.json().catch(() => null)) as unknown
      return {
        result: { ok: false, code: 'LLM_RATE_LIMITED' },
        rawResponse: raw,
      }
    }
    if (!response.ok) {
      const raw = (await response.json().catch(() => null)) as unknown
      return {
        result: { ok: false, code: 'LLM_UNAVAILABLE' },
        rawResponse: raw,
      }
    }
    const raw = (await response.json().catch(() => null)) as unknown
    const usage = parseGeminiUsage(raw)
    const parsed = parseGeminiResponse(raw)
    if (!parsed) {
      return {
        result: { ok: false, code: 'LLM_UNAVAILABLE' },
        rawResponse: raw,
        usage,
      }
    }
    return { result: { ok: true, data: parsed }, rawResponse: raw, usage }
  } catch (error) {
    return {
      result: { ok: false, code: 'LLM_UNAVAILABLE' },
      rawResponse: { error: String(error) },
    }
  } finally {
    clearTimeout(timeout)
  }
}

function emitBatchDebug(
  input: LlmGenerateInput,
  built: { readonly systemInstruction: string; readonly userInstruction: string },
  result: LlmGenerateResult,
  rawResponse: unknown,
  usage: LlmUsageInfo | undefined,
): void {
  if (!input.onBatchDebug) return
  const debug: LlmBatchDebug = {
    systemInstruction: built.systemInstruction,
    userInstruction: built.userInstruction,
    rawResponse,
    usage,
    parsedItems: result.ok ? result.data.items : undefined,
    failure: result.ok ? undefined : result.code,
  }
  try {
    input.onBatchDebug(debug)
  } catch {
    // El callback de trace nunca debe afectar el flujo del request.
  }
}

interface GeminiCandidate {
  readonly content?: {
    readonly parts?: ReadonlyArray<{ readonly text?: string }>
  }
}

interface GeminiUsageMetadata {
  readonly promptTokenCount?: number
  readonly candidatesTokenCount?: number
  readonly totalTokenCount?: number
}

interface GeminiResponse {
  readonly candidates?: readonly GeminiCandidate[]
  readonly usageMetadata?: GeminiUsageMetadata
}

function parseGeminiUsage(raw: unknown): LlmUsageInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const usage = (raw as GeminiResponse).usageMetadata
  if (!usage || typeof usage !== 'object') return undefined
  const promptTokens =
    typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : undefined
  const completionTokens =
    typeof usage.candidatesTokenCount === 'number'
      ? usage.candidatesTokenCount
      : undefined
  const totalTokens =
    typeof usage.totalTokenCount === 'number' ? usage.totalTokenCount : undefined
  if (
    promptTokens === undefined &&
    completionTokens === undefined &&
    totalTokens === undefined
  ) {
    return undefined
  }
  return { promptTokens, completionTokens, totalTokens }
}

function parseGeminiResponse(raw: unknown): LlmGenerateOutput | null {
  if (!raw || typeof raw !== 'object') return null
  const candidates = (raw as GeminiResponse).candidates
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  const text = candidates[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') return null

  let parsed: unknown
  try {
    parsed = JSON.parse(stripJsonFences(text))
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const items = (parsed as { items?: unknown }).items
  if (!Array.isArray(items)) return null

  const normalized: LlmGenerateOutputItem[] = []
  for (const candidate of items) {
    const item = normalizeOutputItem(candidate)
    if (item) normalized.push(item)
  }
  return { items: normalized }
}

function stripJsonFences(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
}

function normalizeOutputItem(raw: unknown): LlmGenerateOutputItem | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const iso2 = readString(record.iso2)?.toUpperCase()
  const tagRaw = readString(record.tag)?.toLowerCase()
  if (!iso2 || !tagRaw || !isAiTriviaTagId(tagRaw)) return null
  const typedTag: AiTriviaTagId = tagRaw

  if (readString(record.error) === 'insufficient_grounding') {
    return { kind: 'insufficient_grounding', iso2, tag: typedTag }
  }

  const riddle = readString(record.riddle)
  const expectedIso2 = readString(
    record.expected_iso2 ?? record.expectedIso2,
  )?.toUpperCase()
  const justification =
    readString(record.justification) ?? readString(record.justification_text) ?? ''
  const claimedSourceTitle = readString(
    record.claimed_source_title ?? record.claimedSourceTitle,
  )
  const claimedSourceLocaleRaw = readString(
    record.claimed_source_locale ?? record.claimedSourceLocale,
  )
  const difficultyRaw = readString(record.difficulty)
  const validRaw = record.valid
  if (
    !riddle ||
    !expectedIso2 ||
    !claimedSourceTitle ||
    !claimedSourceLocaleRaw ||
    !difficultyRaw
  ) {
    return null
  }
  if (!isAppLocale(claimedSourceLocaleRaw)) return null
  if (!isDifficulty(difficultyRaw)) return null
  const claimedSourceLocale: AppLocale = claimedSourceLocaleRaw
  const difficulty: AiPromptDifficulty = difficultyRaw

  return {
    kind: 'ok',
    iso2,
    tag: typedTag,
    riddle,
    expectedIso2,
    justification,
    claimedSourceTitle,
    claimedSourceLocale,
    difficulty,
    valid: validRaw !== false,
  }
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function isDifficulty(value: string): value is AiPromptDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}
