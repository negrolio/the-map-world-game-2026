import tagDictionary from './ai-trivia-tag-dictionary.json' with { type: 'json' }

export type AiTriviaTagId =
  | 'historia'
  | 'politica'
  | 'geografia'
  | 'flora-y-fauna'
  | 'cultura-general'
  | 'musica'
  | 'literatura'
  | 'cine'
  | 'deportes'

export interface AiTriviaTagLabels {
  readonly es: string
  readonly en: string
}

export interface AiTriviaTagPromptHint {
  readonly es: string
  readonly en: string
}

export interface AiTriviaTagEntry {
  readonly id: AiTriviaTagId
  readonly labels: AiTriviaTagLabels
  readonly promptHint: AiTriviaTagPromptHint
}

const rawTags = tagDictionary as readonly AiTriviaTagEntry[]

export const AI_TRIVIA_TAGS: readonly AiTriviaTagEntry[] = rawTags

export const AI_TRIVIA_TAG_IDS: readonly AiTriviaTagId[] = rawTags.map((entry) => entry.id)

const tagIdSet: ReadonlySet<string> = new Set<string>(AI_TRIVIA_TAG_IDS)

const tagByIdIndex: ReadonlyMap<AiTriviaTagId, AiTriviaTagEntry> = new Map(
  rawTags.map((entry) => [entry.id, entry]),
)

export function isAiTriviaTagId(value: string): value is AiTriviaTagId {
  return tagIdSet.has(value)
}

export function getAiTriviaTagEntry(id: AiTriviaTagId): AiTriviaTagEntry {
  const entry = tagByIdIndex.get(id)
  if (!entry) {
    throw new Error(`Unknown AI trivia tag id: ${id}`)
  }
  return entry
}
