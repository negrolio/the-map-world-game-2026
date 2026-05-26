import type {
  FindRandomVariantInput,
  FindRandomVariantOutcome,
  RiddleRepository,
  SaveRiddleInput,
  StoredRiddle,
} from './riddle-repository.js'

/**
 * Adaptador in-memory pensado para tests del orquestador y para iteración
 * local sin Convex (RF-B70). Genera ids opacos `mem-${counter}` que no
 * colisionan con los `Id<'riddles'>` reales de Convex.
 *
 * Nota: este adaptador NUNCA devuelve `{ kind: 'unavailable' }`; representa
 * un backend que siempre está disponible. El test de "convex caído" se
 * orquesta con un repo que devuelva `unavailable` explícitamente.
 */
function bucketKey(iso2: string, tag: string, locale: string): string {
  return `${iso2}|${tag}|${locale}`
}

export interface RiddleRepositoryInMemoryOptions {
  /** Inicial counter (default `1`). Útil para tests determinísticos. */
  readonly initialCounter?: number
}

export function createRiddleRepositoryInMemory(
  options: RiddleRepositoryInMemoryOptions = {},
): RiddleRepository {
  const buckets = new Map<string, StoredRiddle[]>()
  let counter = options.initialCounter ?? 1

  return {
    async findRandomVariant(input: FindRandomVariantInput): Promise<FindRandomVariantOutcome> {
      const bucket = buckets.get(bucketKey(input.iso2, input.tag, input.locale)) ?? []
      const candidates = bucket.filter((r) => !input.excludedIds.has(r.id))
      if (candidates.length === 0) {
        return { kind: 'miss' }
      }
      const index = Math.floor(input.random() * candidates.length)
      const safeIndex = Math.min(Math.max(index, 0), candidates.length - 1)
      return { kind: 'hit', riddle: candidates[safeIndex], layer: 'l2' }
    },

    async save(input: SaveRiddleInput): Promise<StoredRiddle> {
      const id = `mem-${String(counter)}`
      counter += 1
      const stored: StoredRiddle = { id, ...input }
      const key = bucketKey(input.iso2, input.tag, input.locale)
      const bucket = buckets.get(key) ?? []
      bucket.push(stored)
      buckets.set(key, bucket)
      return stored
    },
  }
}
