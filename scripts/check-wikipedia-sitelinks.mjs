/**
 * Verifies shared/wikipedia-sitelinks.json covers all catalog countries with en+es titles.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const catalogPath = resolve(root, 'src/data/countries-catalog.json')
const sitelinksPath = resolve(root, 'shared/wikipedia-sitelinks.json')
const exceptionsPath = resolve(root, 'shared/wikipedia-sitelinks-exceptions.json')

async function loadJson(path) {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw)
}

async function main() {
  const catalog = await loadJson(catalogPath)
  const sitelinks = await loadJson(sitelinksPath)

  let exceptions = {}
  try {
    exceptions = await loadJson(exceptionsPath)
  } catch {
    // optional
  }

  const missingIso2 = []
  const missingTitles = []

  for (const country of catalog) {
    const iso2 = country.iso2
    const entry = sitelinks[iso2] ?? exceptions[iso2]
    if (!entry) {
      missingIso2.push(iso2)
      continue
    }
    const titles = {
      en: entry.titles?.en ?? exceptions[iso2]?.titles?.en,
      es: entry.titles?.es ?? exceptions[iso2]?.titles?.es,
    }
    if (!titles.en || !titles.es) {
      missingTitles.push(iso2)
    }
  }

  if (missingIso2.length > 0) {
    console.error('[check:wikipedia-sitelinks] Missing entries for:', missingIso2.join(', '))
    process.exit(1)
  }

  if (missingTitles.length > 0) {
    console.error('[check:wikipedia-sitelinks] Missing en or es title for:', missingTitles.join(', '))
    process.exit(1)
  }

  const extra = Object.keys(sitelinks).filter(
    (iso2) => !catalog.some((c) => c.iso2 === iso2),
  )
  if (extra.length > 0) {
    console.warn('[check:wikipedia-sitelinks] Extra sitelink keys (not in catalog):', extra.join(', '))
  }

  console.log(`[check:wikipedia-sitelinks] OK (${catalog.length} countries)`)
}

main().catch((error) => {
  console.error('[check:wikipedia-sitelinks] Failed:', error)
  process.exit(1)
})
