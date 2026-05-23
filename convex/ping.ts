import { query } from './_generated/server.js'

/** Smoke test: `npx convex run ping:health` o dashboard → Functions. */
export const health = query({
  args: {},
  handler: async () => ({ ok: true as const }),
})
