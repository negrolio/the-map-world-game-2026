import {
  AI_TRIVIA_TAG_IDS,
  isAiTriviaTagId,
  type AiTriviaTagId,
} from '../../shared/ai-trivia-tags-schema.js'

/**
 * Para cada `iso2` recibido elige un tag uniformemente al azar:
 * - Si `selectedTags` está vacío → del catálogo completo (`AI_TRIVIA_TAG_IDS`).
 * - Si trae tags → del subconjunto (descarta strings no válidos para defender
 *   contra inputs raros aunque la validación del handler ya los rechazaría).
 *
 * `random` es inyectado para hacer los tests deterministas (con seed) y para
 * permitir intercambiar el generador en runtime si se desea.
 */
export interface AssignTagsInput {
  readonly items: ReadonlyArray<{ readonly iso2: string }>
  readonly selectedTags: readonly string[]
  readonly random: () => number
}

export interface ItemWithTag {
  readonly iso2: string
  readonly tag: AiTriviaTagId
}

export function assignTagsToItems(input: AssignTagsInput): readonly ItemWithTag[] {
  const universe = resolveTagUniverse(input.selectedTags)
  if (universe.length === 0) {
    throw new Error('tag-picker: empty tag universe')
  }

  return input.items.map((item) => {
    const index = pickUniformIndex(universe.length, input.random)
    return { iso2: item.iso2, tag: universe[index] }
  })
}

export function resolveTagUniverse(selectedTags: readonly string[]): readonly AiTriviaTagId[] {
  if (selectedTags.length === 0) {
    return AI_TRIVIA_TAG_IDS
  }
  const subset = selectedTags.filter(isAiTriviaTagId)
  if (subset.length === 0) {
    return AI_TRIVIA_TAG_IDS
  }
  return subset
}

function pickUniformIndex(length: number, random: () => number): number {
  const raw = random()
  if (!Number.isFinite(raw) || raw < 0 || raw >= 1) {
    return 0
  }
  return Math.floor(raw * length)
}

/**
 * Pseudo-random determinista (mulberry32) para usar en el handler cuando
 * `seed` está presente en el request. Mantiene la propiedad de tests
 * reproducibles entre clientes y servidor.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
