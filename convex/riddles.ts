import { v } from 'convex/values'

import { mutation, query } from './_generated/server.js'

/**
 * Funciones públicas mínimas consumidas desde el server vía `ConvexHttpClient`
 * (RF-B63). Sin lógica de negocio: la selección de variante, el filtrado por
 * `excludedIds` y la composición con la caché L1 viven en
 * `server/prompts/riddle-repository-*` (D8 del PRD).
 */

const sourceValidator = v.object({
  origin: v.literal('wikipedia'),
  url: v.string(),
  title: v.string(),
  locale: v.union(v.literal('es'), v.literal('en')),
})

export const listByLookup = query({
  args: {
    iso2: v.string(),
    tag: v.string(),
    locale: v.union(v.literal('es'), v.literal('en')),
  },
  handler: async (ctx, { iso2, tag, locale }) =>
    ctx.db
      .query('riddles')
      .withIndex('by_lookup', (q) =>
        q.eq('iso2', iso2).eq('tag', tag).eq('locale', locale),
      )
      .collect(),
})

export const insert = mutation({
  args: {
    iso2: v.string(),
    tag: v.string(),
    locale: v.union(v.literal('es'), v.literal('en')),
    riddle: v.string(),
    source: sourceValidator,
    difficulty: v.union(v.literal('easy'), v.literal('medium'), v.literal('hard')),
    justification: v.string(),
    llmProvider: v.string(),
    validationVersion: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, doc) => ctx.db.insert('riddles', doc),
})
