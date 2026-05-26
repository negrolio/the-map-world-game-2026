import { applyPromptsRateLimitIfNeeded } from '../../_lib/apply-prompts-rate-limit.js'
import {
  applyCorsHeaders,
  CORS_ALLOW_METHODS_POST,
  handleCorsPreflightIfNeeded,
  parseAllowedOrigins,
} from '../../_lib/cors.js'
import { loadLocalEnvIfNeeded } from '../../_lib/load-local-env.js'
import { handleAiPromptsPost } from '../../_lib/handle-ai-prompts-post.js'
import { sendJson } from '../../_lib/json-response.js'
import type { VercelRequest, VercelResponse } from '../../_lib/vercel-types.js'
import { getDefaultPromptsDeps } from '../../../server/prompts/create-default-prompts-deps.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  loadLocalEnvIfNeeded()

  const allowedOrigins = parseAllowedOrigins()
  if (handleCorsPreflightIfNeeded(req, res, allowedOrigins, CORS_ALLOW_METHODS_POST)) {
    return
  }

  applyCorsHeaders(req, res, allowedOrigins, CORS_ALLOW_METHODS_POST)

  if (applyPromptsRateLimitIfNeeded(req, res)) {
    return
  }

  if (req.method !== undefined && req.method !== 'POST') {
    sendJson(res, 405, {
      error: { code: 'INTERNAL_ERROR', message: 'Method Not Allowed' },
    })
    return
  }

  const parsedBody = readJsonBody(req.body)
  if (parsedBody === undefined) {
    sendJson(res, 400, {
      error: { code: 'INVALID_REQUEST', message: 'Request body must be JSON' },
    })
    return
  }

  const result = await handleAiPromptsPost(parsedBody, getDefaultPromptsDeps())
  if (result.ok) {
    sendJson(res, 200, result.data)
    return
  }
  sendJson(res, result.httpStatus, { error: result.error })
}

function readJsonBody(body: unknown): unknown {
  if (body === undefined || body === null) return null
  if (typeof body === 'string') {
    if (body.length === 0) return null
    try {
      return JSON.parse(body) as unknown
    } catch {
      return undefined
    }
  }
  return body
}
