import { ConvexHttpClient } from 'convex/browser'

import { api } from '../../convex/_generated/api.js'
import type { Doc, Id } from '../../convex/_generated/dataModel.js'
import type {
  FindRandomVariantInput,
  FindRandomVariantOutcome,
  RiddleRepository,
  SaveRiddleInput,
  StoredRiddle,
} from './riddle-repository.js'

/**
 * Adaptador Convex del puerto `RiddleRepository`. Vive **solo** en
 * runtime de Vercel Functions; nunca debe ser importado desde `src/`
 * (RNF-S02, RNF-E10).
 *
 * Política de errores:
 * - `findRandomVariant`: cualquier error del transporte se aplana a
 *   `{ kind: 'unavailable' }` para que el orquestador devuelva
 *   `CONVEX_UNAVAILABLE` (RF-B85). No filtramos detalle al cliente.
 * - `save`: propaga el throw. El orquestador lo loguea como
 *   `convex_errors` (RNF-T10) y, si fuera necesario, decide si
 *   degradar la response. En v1 lo dejamos propagar al handler para
 *   mapearlo a 503 vía el manejador genérico.
 */

export interface CreateRiddleRepositoryConvexOptions {
  readonly convexUrl: string
}

export function createRiddleRepositoryConvex(
  options: CreateRiddleRepositoryConvexOptions,
): RiddleRepository {
  const url = options.convexUrl.trim()
  if (url.length === 0) {
    throw new Error('createRiddleRepositoryConvex: convexUrl must be a non-empty string')
  }
  const client = new ConvexHttpClient(url)

  return {
    async findRandomVariant(input: FindRandomVariantInput): Promise<FindRandomVariantOutcome> {
      let docs: Doc<'riddles'>[]
      try {
        docs = (await client.query(api.riddles.listByLookup, {
          iso2: input.iso2,
          tag: input.tag,
          locale: input.locale,
        })) as Doc<'riddles'>[]
      } catch {
        return { kind: 'unavailable' }
      }
      const candidates = docs.filter((doc) => !input.excludedIds.has(doc._id as string))
      if (candidates.length === 0) {
        return { kind: 'miss' }
      }
      const index = Math.floor(input.random() * candidates.length)
      const safeIndex = Math.min(Math.max(index, 0), candidates.length - 1)
      return { kind: 'hit', riddle: docToStored(candidates[safeIndex]), layer: 'l2' }
    },

    async save(input: SaveRiddleInput): Promise<StoredRiddle> {
      const id = (await client.mutation(api.riddles.insert, {
        iso2: input.iso2,
        tag: input.tag,
        locale: input.locale,
        riddle: input.riddle,
        source: input.source,
        difficulty: input.difficulty,
        justification: input.justification,
        llmProvider: input.llmProvider,
        validationVersion: input.validationVersion,
        createdAt: input.createdAt,
      })) as Id<'riddles'>
      return { id: id as string, ...input }
    },
  }
}

function docToStored(doc: Doc<'riddles'>): StoredRiddle {
  return {
    id: doc._id as string,
    iso2: doc.iso2,
    tag: doc.tag as StoredRiddle['tag'],
    locale: doc.locale,
    riddle: doc.riddle,
    source: doc.source,
    difficulty: doc.difficulty,
    justification: doc.justification,
    llmProvider: doc.llmProvider,
    validationVersion: doc.validationVersion,
    createdAt: doc.createdAt,
  }
}
