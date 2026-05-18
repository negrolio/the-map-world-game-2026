import type { VercelResponse } from './vercel-types'

export function sendJson(res: VercelResponse, statusCode: number, body: unknown): void {
  res.status(statusCode).json(body)
}
