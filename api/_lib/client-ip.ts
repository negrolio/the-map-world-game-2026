import type { VercelRequest } from './vercel-types'

function firstForwardedIp(value: string): string {
  const first = value.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return firstForwardedIp(forwarded)
  }
  if (Array.isArray(forwarded)) {
    const head = forwarded[0]
    if (typeof head === 'string') {
      return firstForwardedIp(head)
    }
  }

  const realIp = req.headers?.['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim()
  }

  return 'unknown'
}
