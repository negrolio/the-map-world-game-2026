import type { AppLocale } from '../i18n/app-locale'

/**
 * Persistencia local del set de `riddleId` ya vistos en este dispositivo,
 * por locale. Habilita el dedupe del cliente: cuando se hace un fetch nuevo
 * a `POST /api/v1/prompts/generate`, este set se envía como `excludedIds`
 * para que el server elija una variante distinta (RF-F70..F72 del PRD
 * `riddle-storage-convex/`).
 *
 * - Cap defensivo a 500 entradas por locale (alineado con `MAX_EXCLUDED_IDS`
 *   en el server). Window deslizante: añadir cuando ya hay 500 elimina los
 *   más antiguos.
 * - Tolerante a SSR / modo privado / quota llena de localStorage: cualquier
 *   excepción se silencia y se devuelve un fallback seguro (`[]` o no-op).
 */

const KEY_PREFIX = 'aiTrivia:seenIds:'
const MAX_PER_LOCALE = 500

function storageKey(locale: AppLocale): string {
  return `${KEY_PREFIX}${locale}`
}

function readRaw(locale: AppLocale): string[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(storageKey(locale))
    if (raw === null) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
  } catch {
    return []
  }
}

function writeRaw(locale: AppLocale, values: readonly string[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(storageKey(locale), JSON.stringify(values))
  } catch {
    // SSR, private mode, quota — best-effort persistence.
  }
}

export function getSeenRiddleIds(locale: AppLocale): readonly string[] {
  const values = readRaw(locale)
  if (values.length <= MAX_PER_LOCALE) return values
  return values.slice(values.length - MAX_PER_LOCALE)
}

export function addSeenRiddleId(locale: AppLocale, id: string): void {
  if (!id) return
  const current = readRaw(locale)
  if (current.includes(id)) return
  const next = [...current, id]
  const bounded =
    next.length > MAX_PER_LOCALE ? next.slice(next.length - MAX_PER_LOCALE) : next
  writeRaw(locale, bounded)
}

export function clearSeenRiddleIds(locale: AppLocale): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(storageKey(locale))
  } catch {
    // best-effort
  }
}
