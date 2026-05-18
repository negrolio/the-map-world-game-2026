import { getClientIp } from './client-ip'
import { sendJson } from './json-response'
import {
  checkRateLimit,
  isRateLimitEnabled,
  parseRateLimitConfig,
} from './rate-limit'
import type { VercelRequest, VercelResponse } from './vercel-types'

/**
 * Devuelve true si la petición fue bloqueada (respuesta 429 ya enviada).
 */
export function applyLearnRateLimitIfNeeded(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  if (!isRateLimitEnabled()) {
    return false
  }

  const config = parseRateLimitConfig()
  const clientKey = getClientIp(req)
  const result = checkRateLimit(`learn:${clientKey}`, config)

  if (result.allowed) {
    return false
  }

  if (result.retryAfterSeconds !== undefined) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds))
  }

  sendJson(res, 429, {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests',
    },
  })
  return true
}
