import type {
  FindRandomVariantInput,
  FindRandomVariantOutcome,
  RiddleRepository,
  SaveRiddleInput,
  StoredRiddle,
} from './riddle-repository.js'

/**
 * Decorador in-memory write-through sobre otra implementación de
 * `RiddleRepository`. Acelera reads en caliente dentro del mismo proceso de
 * Vercel Functions, manteniendo la fuente de verdad en `inner` (típicamente
 * Convex). Sin TTL (D6 del PRD); el caché muere con el proceso.
 *
 * Política:
 * - `findRandomVariant`: si el bucket local tiene candidatos válidos
 *   (no excluidos), responde `{ kind: 'hit', layer: 'l1' }` sin tocar
 *   `inner`. Si no, delega a `inner` y, si éste devuelve `hit`, popula L1.
 *   Cuando `inner` devuelve `unavailable`, el decorador propaga sin populate.
 * - `save`: write-through a `inner` y luego popula L1 con el `StoredRiddle`
 *   resultante (incluye el id real generado por la fuente).
 */
function bucketKey(iso2: string, tag: string, locale: string): string {
  return `${iso2}|${tag}|${locale}`
}

export function createRiddleRepositoryWithL1(inner: RiddleRepository): RiddleRepository {
  const buckets = new Map<string, StoredRiddle[]>()

  function pushToBucket(riddle: StoredRiddle): void {
    const key = bucketKey(riddle.iso2, riddle.tag, riddle.locale)
    const bucket = buckets.get(key) ?? []
    if (bucket.some((r) => r.id === riddle.id)) return
    bucket.push(riddle)
    buckets.set(key, bucket)
  }

  return {
    async findRandomVariant(input: FindRandomVariantInput): Promise<FindRandomVariantOutcome> {
      const key = bucketKey(input.iso2, input.tag, input.locale)
      const bucket = buckets.get(key) ?? []
      const localCandidates = bucket.filter((r) => !input.excludedIds.has(r.id))
      if (localCandidates.length > 0) {
        const index = Math.floor(input.random() * localCandidates.length)
        const safeIndex = Math.min(Math.max(index, 0), localCandidates.length - 1)
        return { kind: 'hit', riddle: localCandidates[safeIndex], layer: 'l1' }
      }
      const outcome = await inner.findRandomVariant(input)
      if (outcome.kind === 'hit') {
        pushToBucket(outcome.riddle)
      }
      return outcome
    },

    async save(input: SaveRiddleInput): Promise<StoredRiddle> {
      const saved = await inner.save(input)
      pushToBucket(saved)
      return saved
    },
  }
}
