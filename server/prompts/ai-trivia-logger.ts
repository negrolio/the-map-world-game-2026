import type { AppLocale } from '../../shared/app-locale.js'
import type { AiTriviaTagId } from '../../shared/ai-trivia-tags-schema.js'

/**
 * Logger sin PII para métricas internas (RNF-T07). Solo registra `iso2`,
 * `tag`, `locale`, `code` y contadores numéricos. NUNCA debe loguear el
 * `riddle`, `justification` o respuesta cruda del proveedor.
 */

export interface AiTriviaCounterEvent {
  readonly kind:
    | 'validation_failure'
    | 'llm_request'
    | 'cache_hit_l1'
    | 'cache_hit_l2'
    | 'cache_miss'
    | 'convex_error'
    | 'batch_result'
  readonly rule?: string
  readonly iso2?: string
  readonly tag?: string
  readonly locale?: AppLocale
  readonly code?: string
  readonly requestedCount?: number
  readonly returnedCount?: number
  readonly fallbackRatio?: number
}

export type AiTriviaLogger = (event: AiTriviaCounterEvent) => void

let activeLogger: AiTriviaLogger = defaultConsoleLogger

export function setAiTriviaLogger(logger: AiTriviaLogger): void {
  activeLogger = logger
}

export function resetAiTriviaLoggerForTests(): void {
  activeLogger = defaultConsoleLogger
}

export function incrementValidationFailure(
  rule: string,
  iso2: string,
  tag: AiTriviaTagId,
  locale: AppLocale,
): void {
  activeLogger({
    kind: 'validation_failure',
    rule,
    iso2,
    tag,
    locale,
  })
}

export function recordCacheHitL1(
  iso2: string,
  tag: AiTriviaTagId,
  locale: AppLocale,
): void {
  activeLogger({ kind: 'cache_hit_l1', iso2, tag, locale })
}

export function recordCacheHitL2(
  iso2: string,
  tag: AiTriviaTagId,
  locale: AppLocale,
): void {
  activeLogger({ kind: 'cache_hit_l2', iso2, tag, locale })
}

export function recordCacheMiss(
  iso2: string,
  tag: AiTriviaTagId,
  locale: AppLocale,
): void {
  activeLogger({ kind: 'cache_miss', iso2, tag, locale })
}

/**
 * Reporta un fallo del backend persistente (Convex) al servir un lookup. El
 * orquestador lo emite por cada `(iso2, tag)` que el repositorio devuelve
 * como `unavailable` antes de cortocircuitar la request entera.
 */
export function recordConvexError(
  code: 'lookup' | 'save',
  iso2: string,
  tag: AiTriviaTagId,
  locale: AppLocale,
): void {
  activeLogger({ kind: 'convex_error', code, iso2, tag, locale })
}

export function recordLlmRequest(locale: AppLocale, itemCount: number, attempt: number): void {
  activeLogger({
    kind: 'llm_request',
    locale,
    code: `attempt=${String(attempt)};items=${String(itemCount)}`,
  })
}

/**
 * Cierra cada request al endpoint con un único evento de resumen, útil para
 * calcular `fallback_used_ratio` (RNF-O01) sin tener que agregar manualmente
 * los `validation_failure` por iso2/tag/regla en `vercel logs`.
 *
 * `fallbackRatio` = (requestedCount - returnedCount) / requestedCount, en
 * rango `[0, 1]`. Un valor sostenido > 0.30 indica un problema sistémico.
 */
export function recordBatchResult(
  locale: AppLocale,
  requestedCount: number,
  returnedCount: number,
): void {
  const fallbackRatio =
    requestedCount > 0 ? (requestedCount - returnedCount) / requestedCount : 0
  activeLogger({
    kind: 'batch_result',
    locale,
    requestedCount,
    returnedCount,
    fallbackRatio,
  })
}

function defaultConsoleLogger(event: AiTriviaCounterEvent): void {
  if (process.env.AI_TRIVIA_METRICS_LOG === '1') {
    console.log(JSON.stringify({ ai_trivia: event }))
  }
}
