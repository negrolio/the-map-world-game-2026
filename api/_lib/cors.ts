import type { VercelRequest, VercelResponse } from './vercel-types.js'

const CORS_ALLOW_METHODS = 'GET, POST, OPTIONS'
const CORS_ALLOW_HEADERS = 'Content-Type'

export function parseAllowedOrigins(
  envValue: string | undefined = process.env.ALLOWED_ORIGINS,
): string[] {
  if (!envValue?.trim()) {
    return []
  }
  return envValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function applyCorsHeaders(
  req: VercelRequest,
  res: VercelResponse,
  allowedOrigins: readonly string[],
): void {
  const requestOrigin = req.headers?.origin
  if (typeof requestOrigin !== 'string') {
    return
  }
  if (!allowedOrigins.includes(requestOrigin)) {
    return
  }
  res.setHeader('Access-Control-Allow-Origin', requestOrigin)
  res.setHeader('Access-Control-Allow-Methods', CORS_ALLOW_METHODS)
  res.setHeader('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS)
  res.setHeader('Vary', 'Origin')
}

export function handleCorsPreflightIfNeeded(
  req: VercelRequest,
  res: VercelResponse,
  allowedOrigins: readonly string[],
): boolean {
  applyCorsHeaders(req, res, allowedOrigins)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
