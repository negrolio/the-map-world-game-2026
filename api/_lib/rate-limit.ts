export interface RateLimitConfig {
  readonly maxRequests: number
  readonly windowMs: number
}

export interface RateLimitCheckResult {
  readonly allowed: boolean
  readonly retryAfterSeconds?: number
}

interface RateLimitBucket {
  count: number
  windowStartMs: number
}

const buckets = new Map<string, RateLimitBucket>()

type RateLimitEnv = {
  readonly RATE_LIMIT_MAX?: string
  readonly RATE_LIMIT_WINDOW_MS?: string
  readonly RATE_LIMIT_DISABLED?: string
  readonly RATE_LIMIT_ENABLED?: string
  readonly VERCEL_ENV?: string
}

const DEFAULT_MAX_REQUESTS = 60
const DEFAULT_WINDOW_MS = 60_000

export function parseRateLimitConfig(
  env: RateLimitEnv = process.env,
): RateLimitConfig {
  const maxRaw = env.RATE_LIMIT_MAX
  const windowRaw = env.RATE_LIMIT_WINDOW_MS

  const maxParsed = maxRaw !== undefined ? Number.parseInt(maxRaw, 10) : DEFAULT_MAX_REQUESTS
  const windowParsed =
    windowRaw !== undefined ? Number.parseInt(windowRaw, 10) : DEFAULT_WINDOW_MS

  const maxRequests =
    Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : DEFAULT_MAX_REQUESTS
  const windowMs =
    Number.isFinite(windowParsed) && windowParsed > 0 ? windowParsed : DEFAULT_WINDOW_MS

  return { maxRequests, windowMs }
}

export function isRateLimitEnabled(env: RateLimitEnv = process.env): boolean {
  if (env.RATE_LIMIT_DISABLED === '1') {
    return false
  }
  if (env.RATE_LIMIT_ENABLED === '1') {
    return true
  }
  const vercelEnv = env.VERCEL_ENV
  return vercelEnv === 'production' || vercelEnv === 'preview'
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  nowMs: number = Date.now(),
): RateLimitCheckResult {
  const existing = buckets.get(key)
  const windowExpired =
    existing === undefined || nowMs - existing.windowStartMs >= config.windowMs

  if (windowExpired) {
    buckets.set(key, { count: 1, windowStartMs: nowMs })
    return { allowed: true }
  }

  if (existing.count >= config.maxRequests) {
    const retryAfterMs = config.windowMs - (nowMs - existing.windowStartMs)
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
    return { allowed: false, retryAfterSeconds }
  }

  existing.count += 1
  return { allowed: true }
}

/** Solo tests: reinicia contadores en memoria del runtime actual. */
export function resetRateLimitBucketsForTests(): void {
  buckets.clear()
}
