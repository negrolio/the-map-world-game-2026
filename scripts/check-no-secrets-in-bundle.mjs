/**
 * Smoke de seguridad para CI: tras `vite build`, recorre el directorio `dist/`
 * y falla si alguna palabra clave sensible aparece en el bundle del cliente
 * (no debería suceder porque las claves del servidor son env vars y nunca se
 * importan desde `src/`, pero un import accidental se debe atajar antes del
 * deploy).
 *
 * Uso:
 *   node scripts/check-no-secrets-in-bundle.mjs            (defaults)
 *   FORBID_BUNDLE_TERMS=GEMINI_API_KEY,FOO node scripts/...
 *
 * Sale con código 1 si encuentra al menos una coincidencia.
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const DEFAULT_TERMS = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']
const DEFAULT_DIST = resolve(import.meta.dirname, '..', 'dist')

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    const info = await stat(full)
    if (info.isDirectory()) {
      yield* walk(full)
    } else {
      yield full
    }
  }
}

async function main() {
  const distPath = process.env.BUNDLE_DIR ? resolve(process.env.BUNDLE_DIR) : DEFAULT_DIST
  const forbidEnv = process.env.FORBID_BUNDLE_TERMS
  const forbidden = forbidEnv
    ? forbidEnv
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : DEFAULT_TERMS

  const hits = []
  let scanned = 0
  for await (const path of walk(distPath)) {
    if (!/\.(js|mjs|css|html|json|map)$/.test(path)) continue
    scanned += 1
    const content = await readFile(path, 'utf8').catch(() => null)
    if (!content) continue
    for (const term of forbidden) {
      if (content.includes(term)) {
        hits.push({ path, term })
      }
    }
  }

  if (hits.length > 0) {
    console.error(`[check-no-secrets-in-bundle] Found ${hits.length} forbidden term(s) in ${distPath}:`)
    for (const hit of hits) {
      console.error(`  ${hit.term} in ${hit.path}`)
    }
    process.exit(1)
  }

  console.log(
    `[check-no-secrets-in-bundle] OK · scanned ${scanned} files in ${distPath}; no forbidden terms found (${forbidden.join(', ')}).`,
  )
}

main().catch((error) => {
  console.error('[check-no-secrets-in-bundle] Failed:', error)
  process.exit(1)
})
