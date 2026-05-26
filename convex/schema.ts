import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * Persistencia de adivinanzas validadas (modo AI trivia).
 *
 * Ver
 * `docs/tasks/backend-related-features/riddle-storage-convex/01-prd-riddle-storage-convex.md` §3.1.
 *
 * - `iso2`, `tag`, `locale`: clave compuesta del lookup desde el server.
 * - `validationVersion`: snapshot del set de reglas V1..V8 vigente al persistir
 *   (constante `AI_TRIVIA_VALIDATION_VERSION` en `server/prompts/`). Permite
 *   un job batch de re-validación en v2 sin migrar el schema.
 * - `justification`: solo para auditoría/debug en Convex (D2, RNF-S02). NUNCA
 *   debe filtrar al cliente vía la API.
 * - Índice `by_lookup` cubre la query principal (RF-B61).
 * - Índice `by_origin` queda preparado para auditoría agregada por origen y
 *   antigüedad (RF-B62); en v1 no hay job que lo consuma.
 */
export default defineSchema({
  riddles: defineTable({
    iso2: v.string(),
    tag: v.string(),
    locale: v.union(v.literal('es'), v.literal('en')),
    riddle: v.string(),
    source: v.object({
      origin: v.literal('wikipedia'),
      url: v.string(),
      title: v.string(),
      locale: v.union(v.literal('es'), v.literal('en')),
    }),
    difficulty: v.union(v.literal('easy'), v.literal('medium'), v.literal('hard')),
    justification: v.string(),
    llmProvider: v.string(),
    validationVersion: v.number(),
    createdAt: v.number(),
  })
    .index('by_lookup', ['iso2', 'tag', 'locale'])
    .index('by_origin', ['source.origin', 'createdAt']),
})
