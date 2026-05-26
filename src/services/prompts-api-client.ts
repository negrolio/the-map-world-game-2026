import type { AppLocale } from '../i18n/app-locale'
import type {
  AiPromptDifficulty,
  AiPromptItem,
  AiPromptSource,
  AiPromptsApiErrorCode,
  AiPromptsApiErrorPayload,
  AiPromptsResponse,
} from '../../shared/ai-trivia-api'
import { isAiPromptsApiErrorCode } from '../../shared/ai-trivia-api'
import { isAiTriviaTagId } from '../../shared/ai-trivia-tags-schema'

export interface FetchAiPromptsInput {
  readonly items: ReadonlyArray<{ readonly iso2: string }>
  readonly tags: readonly string[]
  readonly locale: AppLocale
  readonly seed?: number
  /**
   * Identificadores opacos (`AiPromptItem.riddleId`) ya vistos en este
   * dispositivo. El servidor los excluye al elegir variantes. Solo se
   * envía si tiene al menos un elemento.
   */
  readonly excludedIds?: readonly string[]
  readonly signal?: AbortSignal
  readonly fetchImpl?: typeof fetch
}

export type FetchAiPromptsResult =
  | { readonly ok: true; readonly data: AiPromptsResponse }
  | { readonly ok: false; readonly error: AiPromptsApiErrorPayload }

export function resolvePromptsApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw !== 'string') {
    return ''
  }
  return raw.trim().replace(/\/$/, '')
}

export function buildPromptsGenerateUrl(baseUrl: string): string {
  return `${baseUrl}/api/v1/prompts/generate`
}

export async function fetchAiPrompts(
  input: FetchAiPromptsInput,
): Promise<FetchAiPromptsResult> {
  const baseUrl = resolvePromptsApiBaseUrl()
  if (!baseUrl) {
    return failure('INTERNAL_ERROR', 'VITE_API_BASE_URL is not configured')
  }
  const url = buildPromptsGenerateUrl(baseUrl)
  const body = {
    items: input.items,
    tags: input.tags,
    locale: input.locale,
    ...(typeof input.seed === 'number' ? { seed: input.seed } : {}),
    ...(input.excludedIds && input.excludedIds.length > 0
      ? { excludedIds: input.excludedIds }
      : {}),
  }
  const fetchImpl = input.fetchImpl ?? fetch
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: input.signal,
    })
    const raw = (await response.json().catch(() => null)) as unknown
    if (!response.ok) {
      return { ok: false, error: parseError(raw) }
    }
    const parsed = parseSuccess(raw)
    if (!parsed) {
      return failure('INTERNAL_ERROR', 'Invalid prompts response')
    }
    return { ok: true, data: parsed }
  } catch (error) {
    if ((error as { name?: string }).name === 'AbortError') {
      return failure('INTERNAL_ERROR', 'Aborted')
    }
    return failure('LLM_UNAVAILABLE', 'Network request failed')
  }
}

function parseError(body: unknown): AiPromptsApiErrorPayload {
  if (body && typeof body === 'object' && 'error' in body) {
    const nested = (body as { error?: unknown }).error
    if (nested && typeof nested === 'object' && 'code' in nested) {
      const candidateCode = (nested as { code: unknown }).code
      const candidateMessage = (nested as { message?: unknown }).message
      if (typeof candidateCode === 'string' && isAiPromptsApiErrorCode(candidateCode)) {
        return {
          code: candidateCode,
          message:
            typeof candidateMessage === 'string' ? candidateMessage : candidateCode,
        }
      }
    }
  }
  return { code: 'INTERNAL_ERROR', message: 'Request failed' }
}

function parseSuccess(body: unknown): AiPromptsResponse | null {
  if (!body || typeof body !== 'object') return null
  const itemsRaw = (body as { items?: unknown }).items
  if (!Array.isArray(itemsRaw)) return null
  const items: AiPromptItem[] = []
  for (const candidate of itemsRaw) {
    const parsed = parseItem(candidate)
    if (parsed) items.push(parsed)
  }
  if (itemsRaw.length > 0 && items.length === 0) {
    return null
  }
  return { items }
}

function parseItem(raw: unknown): AiPromptItem | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.riddleId !== 'string' || record.riddleId.length === 0) return null
  if (typeof record.iso2 !== 'string') return null
  const tagRaw = typeof record.tag === 'string' ? record.tag.trim().toLowerCase() : ''
  if (!tagRaw || !isAiTriviaTagId(tagRaw)) return null
  if (typeof record.riddle !== 'string' || record.riddle.length === 0) return null
  if (typeof record.difficulty !== 'string' || !isDifficulty(record.difficulty)) return null
  const source = parseSource(record.source)
  if (!source) return null
  return {
    riddleId: record.riddleId,
    iso2: record.iso2.toUpperCase(),
    tag: tagRaw,
    riddle: record.riddle,
    difficulty: record.difficulty,
    source,
  }
}

function parseSource(raw: unknown): AiPromptSource | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.title !== 'string' || record.title.length === 0) return null
  if (record.locale !== 'es' && record.locale !== 'en') return null
  if (typeof record.url !== 'string') return null
  let parsed: URL
  try {
    parsed = new URL(record.url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  if (!/(^|\.)wikipedia\.org$/i.test(parsed.hostname)) return null
  const locale = record.locale
  const url =
    parsed.protocol === 'https:'
      ? record.url
      : record.url.replace(/^http:/i, 'https:')
  return { title: record.title, locale, url }
}

function isDifficulty(value: string): value is AiPromptDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

function failure(
  code: AiPromptsApiErrorCode,
  message: string,
): FetchAiPromptsResult {
  return { ok: false, error: { code, message } }
}
