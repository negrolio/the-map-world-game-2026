import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let didAttemptLoad = false

/**
 * En `vercel dev` + Vite, las variables de `.env.local` a veces llegan al
 * proceso de Vite (`VITE_*`) pero no al runtime de `api/`. Carga el archivo
 * una vez por proceso, sin sobrescribir variables ya definidas (p. ej. las
 * del dashboard de Vercel).
 */
export function loadLocalEnvIfNeeded(): void {
  if (didAttemptLoad) {
    return
  }
  didAttemptLoad = true

  if (process.env.VERCEL_ENV === 'production') {
    return
  }

  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) {
    return
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const eq = trimmed.indexOf('=')
    if (eq <= 0) {
      continue
    }
    const key = trimmed.slice(0, eq).trim()
    if (!key || process.env[key] !== undefined) {
      continue
    }
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}
