import type { AiPromptItem } from '../../shared/ai-trivia-api'
import type { QuestionPoolItem } from './build-question-pool'

/**
 * Convierte la lista de items AI (devueltos por `/api/v1/prompts/generate`)
 * en el shape de pool que consume `beginPlayingSession`. Solo conserva los
 * items cuyo `iso2` esté en `validIso2Set`, mantiene el orden original y
 * deduplica por iso2 (caller siempre debería enviar uno por país, pero por
 * defensa).
 */
export interface MapAiItemsInput {
  readonly items: readonly AiPromptItem[]
  readonly validIso2Set: ReadonlySet<string>
}

export interface MapAiItemsResult {
  readonly pool: readonly QuestionPoolItem[]
  readonly droppedCount: number
}

export function mapAiItemsToPool(input: MapAiItemsInput): MapAiItemsResult {
  const pool: QuestionPoolItem[] = []
  const seen = new Set<string>()
  let droppedCount = 0
  for (const item of input.items) {
    const iso2 = item.iso2.toUpperCase()
    if (!input.validIso2Set.has(iso2)) {
      droppedCount += 1
      continue
    }
    if (seen.has(iso2)) {
      droppedCount += 1
      continue
    }
    seen.add(iso2)
    pool.push({
      id: `ai-${iso2}-${item.tag}`,
      answerCountryCode: iso2,
      prompt: item.riddle,
      mode: 'ai',
      aiSource: item.source,
    })
  }
  return { pool, droppedCount }
}
