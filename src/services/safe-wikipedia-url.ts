const ALLOWED_HOST_REGEX = /\.wikipedia\.org$/i

/**
 * Valida defensivamente que `value` sea una URL HTTPS apuntando a `*.wikipedia.org`.
 *
 * Pensado para gating de enlaces externos provistos por el LLM (modo AI trivia).
 * Devuelve `false` ante:
 *  - URLs malformadas (`URL` constructor falla).
 *  - Esquema distinto a `https:` (`http`, `javascript`, etc.).
 *  - Hosts que no terminan en `.wikipedia.org` (subdominios ajenos al proyecto).
 *
 * Reusado por `AiSourceLink` (cartel de cierre de ronda) y `AiRoundsSummary`
 * (resumen final post-partida). Mantener regex y check HTTPS sincronizados.
 */
export function isSafeWikipediaUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && ALLOWED_HOST_REGEX.test(parsed.hostname)
  } catch {
    return false
  }
}
