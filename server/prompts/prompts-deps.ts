import type { AppLocale } from '../../shared/app-locale.js'
import type { AiTriviaTagId } from '../../shared/ai-trivia-tags-schema.js'
import type { AiPromptDifficulty, AiPromptItem } from '../../shared/ai-trivia-api.js'
import type { AiTriviaTracer } from './ai-trivia-trace.js'

export type LlmAttemptNumber = 1 | 2 | 3

export interface LlmGenerateInputItem {
  readonly iso2: string
  readonly tag: AiTriviaTagId
}

export interface LlmRerollContextEntry {
  readonly iso2: string
  readonly tag: AiTriviaTagId
  readonly failedRule:
    | 'V1_ISO_MISMATCH'
    | 'V2_FORBIDDEN_TERM'
    | 'V3_LENGTH'
    | 'V4_LANGUAGE'
    | 'V5_ARTICLE_MISSING'
    | 'V6_COUNTRY_NOT_MENTIONED'
    | 'V7_SELF_INVALID'
    | 'V8_BAD_DIFFICULTY'
    | 'PARSE_ERROR'
}

export interface LlmUsageInfo {
  readonly promptTokens?: number
  readonly completionTokens?: number
  readonly totalTokens?: number
}

/**
 * Información cruda de una llamada batch al proveedor LLM. Solo se materializa
 * cuando el caller pasa `onBatchDebug`; en runtime normal (sin trace) no se
 * recolecta para no añadir overhead.
 */
export interface LlmBatchDebug {
  readonly systemInstruction: string
  readonly userInstruction: string
  readonly rawResponse: unknown
  readonly usage?: LlmUsageInfo
  readonly parsedItems?: readonly LlmGenerateOutputItem[]
  readonly failure?: LlmFailureCode
}

export interface LlmGenerateInput {
  readonly items: readonly LlmGenerateInputItem[]
  readonly locale: AppLocale
  readonly attempt: LlmAttemptNumber
  readonly rerollContext?: readonly LlmRerollContextEntry[]
  /**
   * Callback opcional invocado por la implementación del `LlmClient` con el
   * detalle crudo de la llamada (prompt enviado, respuesta y tokens). Pensado
   * exclusivamente para tracing local; los clients fake pueden ignorarlo.
   */
  readonly onBatchDebug?: (debug: LlmBatchDebug) => void
}

export type LlmGenerateOutputItem =
  | {
      readonly kind: 'ok'
      readonly iso2: string
      readonly tag: AiTriviaTagId
      readonly riddle: string
      readonly expectedIso2: string
      readonly justification: string
      readonly claimedSourceTitle: string
      readonly claimedSourceLocale: AppLocale
      readonly difficulty: AiPromptDifficulty
      readonly valid: boolean
    }
  | { readonly kind: 'insufficient_grounding'; readonly iso2: string; readonly tag: AiTriviaTagId }

export interface LlmGenerateOutput {
  readonly items: readonly LlmGenerateOutputItem[]
}

export type LlmFailureCode = 'LLM_UNAVAILABLE' | 'LLM_RATE_LIMITED'

export type LlmGenerateResult =
  | { readonly ok: true; readonly data: LlmGenerateOutput }
  | { readonly ok: false; readonly code: LlmFailureCode }

export interface LlmClient {
  generateRiddles(input: LlmGenerateInput): Promise<LlmGenerateResult>
}

export interface AiTriviaCacheKey {
  readonly iso2: string
  readonly tag: AiTriviaTagId
  readonly locale: AppLocale
}

export interface AiTriviaCache {
  get(key: AiTriviaCacheKey): AiPromptItem | undefined
  set(key: AiTriviaCacheKey, item: AiPromptItem): void
}

export interface WikipediaGroundingCheck {
  readonly iso2: string
  readonly claimedTitle: string
  readonly claimedLocale: AppLocale
}

export type WikipediaGroundingResult =
  | { readonly ok: true; readonly exists: true; readonly mentionsCountry: boolean }
  | { readonly ok: true; readonly exists: false }
  | { readonly ok: false; readonly code: 'WIKIPEDIA_UNAVAILABLE' }

export interface WikipediaGroundingClient {
  checkGrounding(check: WikipediaGroundingCheck): Promise<WikipediaGroundingResult>
}

export interface GenerateAiPromptsDeps {
  readonly llmClient: LlmClient
  readonly groundingClient: WikipediaGroundingClient
  readonly cache: AiTriviaCache
  readonly now: () => number
  readonly random: () => number
  /**
   * Tracer **opcional** de inspección manual en desarrollo local. Si está
   * presente, `generateAiPrompts` registra cada paso (cache, batches, V1..V8,
   * tokens) en un archivo por request. Se construye desde
   * `createAiTriviaTracerFromEnv()` y permanece `undefined` en producción.
   */
  readonly tracer?: AiTriviaTracer
}
