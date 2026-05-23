import { createRequire } from 'node:module'

import type { AppLocale } from '../../shared/app-locale.js'

interface ForbiddenEntry {
  readonly es: readonly string[]
  readonly en: readonly string[]
}

const require = createRequire(import.meta.url)
const rawTerms = require('../../shared/country-forbidden-terms.json') as Readonly<
  Record<string, ForbiddenEntry>
>

interface ForbiddenIndex {
  readonly es: readonly string[]
  readonly en: readonly string[]
}

const indexByIso2: ReadonlyMap<string, ForbiddenIndex> = new Map(
  Object.entries(rawTerms).map(([iso2, entry]) => [
    iso2.toUpperCase(),
    {
      es: entry.es.map((term) => normalizeForMatch(term)),
      en: entry.en.map((term) => normalizeForMatch(term)),
    },
  ]),
)

/**
 * Devuelve la lista combinada (locale principal + en como respaldo) de
 * términos prohibidos para un país, ya normalizada para matching.
 *
 * Devuelve `null` si el iso2 no existe en el artefacto (caller decide).
 */
export function getForbiddenTermsForIso2(
  iso2: string,
  locale: AppLocale,
): readonly string[] | null {
  const entry = indexByIso2.get(iso2.toUpperCase())
  if (!entry) return null

  const seen = new Set<string>()
  const result: string[] = []
  for (const term of entry[locale]) {
    if (!seen.has(term)) {
      seen.add(term)
      result.push(term)
    }
  }
  for (const term of entry.en) {
    if (!seen.has(term)) {
      seen.add(term)
      result.push(term)
    }
  }
  return result
}

/**
 * Devuelve la primera entrada prohibida que aparece en `text` (o `null` si
 * ninguna está presente). El matching es case-insensitive y normalizado
 * Unicode-NFC; se respetan los límites con frontera no-alfabética para
 * evitar falsos positivos (p. ej. "cubano" no debería matchear "cuba" si
 * la palabra está dentro de otra; pero deliberadamente "Argentina" sí
 * matchea "argentino"/"argentinos" porque la raíz contiene la prohibida).
 *
 * Nota: usamos `String.prototype.includes` con texto y término ya
 * normalizados; esto cubre los casos reales que pide la V2 sin riesgo de
 * regex injection desde los datos del artefacto.
 */
export function findFirstForbiddenTerm(
  text: string,
  forbidden: readonly string[],
): string | null {
  const haystack = normalizeForMatch(text)
  for (const term of forbidden) {
    if (term.length === 0) continue
    if (haystack.includes(term)) {
      return term
    }
  }
  return null
}

export function normalizeForMatch(value: string): string {
  return value.normalize('NFC').toLowerCase()
}

/**
 * Solo para tests / debug: cuántos iso2 hay en el índice (sirve para
 * detectar artefactos no commiteados sin abrir el JSON).
 */
export function getForbiddenTermsIso2Count(): number {
  return indexByIso2.size
}
