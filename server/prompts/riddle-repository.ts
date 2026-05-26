import type { AppLocale } from '../../shared/app-locale.js'
import type { AiPromptDifficulty } from '../../shared/ai-trivia-api.js'
import type { AiTriviaTagId } from '../../shared/ai-trivia-tags-schema.js'

/**
 * Puerto del almacén persistente de riddles validados (modo AI trivia).
 *
 * Implementaciones:
 * - `riddle-repository-in-memory.ts`: tests del orquestador (sin Convex).
 * - `riddle-repository-convex.ts`: producción + dev local con Convex.
 * - `riddle-repository-l1.ts`: decorador in-memory que envuelve a otra
 *   implementación para acelerar reads en caliente dentro del mismo proceso.
 *
 * Decisiones de PRD relevantes: D2 (única tabla `riddles`), D5 (server
 * controla la selección de variante), D6 (L1 sin TTL). Nunca exponer
 * `justification` al cliente (RNF-S02).
 */

export interface StoredRiddleSource {
  readonly origin: 'wikipedia'
  readonly url: string
  readonly title: string
  readonly locale: AppLocale
}

export interface StoredRiddle {
  /** `Doc<'riddles'>._id` serializado como string opaco para el cliente. */
  readonly id: string
  readonly iso2: string
  readonly tag: AiTriviaTagId
  readonly locale: AppLocale
  readonly riddle: string
  readonly source: StoredRiddleSource
  readonly difficulty: AiPromptDifficulty
  readonly justification: string
  readonly llmProvider: string
  readonly validationVersion: number
  readonly createdAt: number
}

export interface FindRandomVariantInput {
  readonly iso2: string
  readonly tag: AiTriviaTagId
  readonly locale: AppLocale
  readonly excludedIds: ReadonlySet<string>
  readonly random: () => number
}

/**
 * Resultado de una búsqueda de variante:
 *
 * - `hit`: hay candidato; `layer` informa de qué capa salió (`'l1'` cuando lo
 *   sirvió la caché in-memory del proceso, `'l2'` cuando vino del backend
 *   persistente). El orquestador lo usa para emitir métricas separadas.
 * - `miss`: no hay variantes para `(iso2, tag, locale)` que no estén en
 *   `excludedIds`. El orquestador llamará al LLM para generar y luego
 *   `save()` la respuesta validada.
 * - `unavailable`: el backend persistente está caído (timeout, 5xx, etc.).
 *   El orquestador cortocircuita la request entera con `CONVEX_UNAVAILABLE`.
 */
export type FindRandomVariantOutcome =
  | { readonly kind: 'hit'; readonly riddle: StoredRiddle; readonly layer: 'l1' | 'l2' }
  | { readonly kind: 'miss' }
  | { readonly kind: 'unavailable' }

export interface SaveRiddleInput {
  readonly iso2: string
  readonly tag: AiTriviaTagId
  readonly locale: AppLocale
  readonly riddle: string
  readonly source: StoredRiddleSource
  readonly difficulty: AiPromptDifficulty
  readonly justification: string
  readonly llmProvider: string
  readonly validationVersion: number
  readonly createdAt: number
}

export interface RiddleRepository {
  findRandomVariant(input: FindRandomVariantInput): Promise<FindRandomVariantOutcome>
  save(input: SaveRiddleInput): Promise<StoredRiddle>
}
