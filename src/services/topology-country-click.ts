import { alpha2FromIso3166Numeric } from '../data/iso3166-numeric-to-alpha2'
import type { IsoCountryCode } from '../types'

/** world-atlas: algunas áreas no tienen `id` numérico; mapeo de facto para el juego. */
const WORLD_ATLAS_NAME_TO_ISO2: Readonly<Record<string, IsoCountryCode>> = {
  Kosovo: 'XK',
}

/**
 * Lee ISO 3166-1 alpha-2 desde propiedades Natural Earth / world-atlas (campo ISO_A2).
 * Valores sentinela (-99) o ausentes se tratan como desconocido.
 */
export function readIso2FromTopologyProperties(
  properties: Record<string, unknown> | undefined,
): string | undefined {
  if (!properties) {
    return undefined
  }

  const isoRaw = properties['ISO_A2']
  if (typeof isoRaw !== 'string') {
    return undefined
  }

  const trimmed = isoRaw.trim().toUpperCase()
  if (trimmed === '' || trimmed === '-99') {
    return undefined
  }

  return trimmed
}

/**
 * Devuelve el ISO2 canónico solo si está en el catálogo de la app (misma fuente que el juego).
 */
export function resolveCatalogIso2OrNull(
  iso2Candidate: string | undefined,
  catalogIso2: ReadonlySet<string>,
): IsoCountryCode | null {
  if (!iso2Candidate) {
    return null
  }

  return catalogIso2.has(iso2Candidate) ? iso2Candidate : null
}

/**
 * ISO2 del feature clickeado (borde UI). Orden: `ISO_A2` en propiedades (Natural Earth completo),
 * código numérico ISO 3166-1 en `geography.id` (world-atlas), nombre world-atlas con excepciones mínimas.
 * `null` si no hay identificador usable. El juego evalúa pool/acierto aparte (opción B).
 */
export function resolveCountryClickFromTopologyProperties(
  properties: Record<string, unknown> | undefined,
  geographyId?: string | number,
): IsoCountryCode | null {
  const fromProperties = readIso2FromTopologyProperties(properties)
  if (fromProperties) {
    return fromProperties
  }

  const fromNumeric = alpha2FromIso3166Numeric(geographyId)
  if (fromNumeric) {
    return fromNumeric
  }

  const nameRaw = properties?.['name']
  if (typeof nameRaw === 'string') {
    const mapped = WORLD_ATLAS_NAME_TO_ISO2[nameRaw]
    if (mapped) {
      return mapped
    }
  }

  return null
}
