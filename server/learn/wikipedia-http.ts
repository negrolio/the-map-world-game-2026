import { assertWikipediaRequestUrl } from './wikipedia-url.js'

export type WikipediaHttpResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number | 'network' }

export async function wikipediaFetchJson<T>(
  url: string,
  options: {
    readonly fetchImpl: typeof fetch
    readonly userAgent: string
    readonly timeoutMs: number
  },
): Promise<WikipediaHttpResult<T>> {
  assertWikipediaRequestUrl(url)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs)

  try {
    const response = await options.fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': options.userAgent,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      return { ok: false, status: response.status }
    }

    const data = (await response.json()) as T
    return { ok: true, data }
  } catch {
    return { ok: false, status: 'network' }
  } finally {
    clearTimeout(timeout)
  }
}

export function isWikipediaUpstreamFailure(
  result: WikipediaHttpResult<unknown>,
): boolean {
  if (result.ok) {
    return false
  }

  const { status } = result
  if (status === 'network') {
    return true
  }
  if (status === 404) {
    return false
  }
  return status >= 500 || status === 429
}
