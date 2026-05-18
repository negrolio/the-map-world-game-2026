import { applyLearnRateLimitIfNeeded } from '../../../_lib/apply-learn-rate-limit'
import {
  applyCorsHeaders,
  handleCorsPreflightIfNeeded,
  parseAllowedOrigins,
} from '../../../_lib/cors'
import { handleLearnGet } from '../../../_lib/handle-learn-get'
import { sendJson } from '../../../_lib/json-response'
import type { VercelRequest, VercelResponse } from '../../../_lib/vercel-types'
import { getDefaultLearnDeps } from '../../../../server/learn/create-default-learn-deps'

function readQueryParam(
  query: VercelRequest['query'],
  key: string,
): string | undefined {
  const value = query?.[key]
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value[0]
  }
  return undefined
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const allowedOrigins = parseAllowedOrigins()
  if (handleCorsPreflightIfNeeded(req, res, allowedOrigins)) {
    return
  }

  applyCorsHeaders(req, res, allowedOrigins)

  if (applyLearnRateLimitIfNeeded(req, res)) {
    return
  }

  if (req.method !== undefined && req.method !== 'GET') {
    sendJson(res, 405, { error: { code: 'INTERNAL_ERROR', message: 'Method Not Allowed' } })
    return
  }

  const iso2 = readQueryParam(req.query, 'iso2')
  const locale = readQueryParam(req.query, 'locale')

  if (!iso2 || !locale) {
    sendJson(res, 400, {
      error: { code: 'INVALID_LOCALE', message: 'iso2 and locale query are required' },
    })
    return
  }

  const result = await handleLearnGet(iso2, locale, getDefaultLearnDeps())

  if (result.ok) {
    sendJson(res, 200, result.data)
    return
  }

  sendJson(res, result.httpStatus, { error: result.error })
}
