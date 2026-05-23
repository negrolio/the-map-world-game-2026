/**
 * Generates shared/country-forbidden-terms.json from:
 *   - src/data/countries-catalog.json   (name en, capital en)
 *   - src/data/capital-es-map.json      (capital es)
 *   - shared/wikipedia-sitelinks.json   (canonical es/en titles)
 *   - i18n-iso-countries package        (aliases es/en)
 *   - optional Wikidata enrichment with --enrich (demonym, currency)
 *
 * Output: { [iso2]: { es: string[], en: string[] } } where each array contains
 * lowercase-deduped forbidden terms (country name, aliases, capital). The
 * validator V2 (server/prompts/forbidden-terms.ts) does a case-insensitive
 * substring match against the riddle in both locales.
 *
 * Idempotent: re-running with the same inputs produces byte-identical output
 * (entries sorted by iso2, terms unique and sorted alphabetically).
 *
 * Usage:
 *   node scripts/build-country-forbidden-terms.mjs            (offline)
 *   node scripts/build-country-forbidden-terms.mjs --enrich   (Wikidata)
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const countries = require('i18n-iso-countries')
const enLocale = require('i18n-iso-countries/langs/en.json')
const esLocale = require('i18n-iso-countries/langs/es.json')

countries.registerLocale(enLocale)
countries.registerLocale(esLocale)

const root = resolve(import.meta.dirname, '..')
const catalogPath = resolve(root, 'src/data/countries-catalog.json')
const capitalEsPath = resolve(root, 'src/data/capital-es-map.json')
const sitelinksPath = resolve(root, 'shared/wikipedia-sitelinks.json')
const outputPath = resolve(root, 'shared/country-forbidden-terms.json')

const USER_AGENT =
  'MapWorldGame/1.0 (https://github.com/negrolio/the-map-world-game-2026; map-world-game-dev@users.noreply.github.com)'
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const BATCH_SIZE = 50
const REQUEST_DELAY_MS = 200

async function loadJson(path) {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw)
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms)
  })
}

function normalizeTerm(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.normalize('NFC').trim()
  if (trimmed.length === 0) return null
  return trimmed
}

function asArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return [value]
  return []
}

function getAliasesForLocale(iso2, locale) {
  const aliases = countries.getName(iso2, locale, { select: 'all' })
  return asArray(aliases)
}

async function maybeEnrichWithWikidata(catalog, sitelinks) {
  const qidByIso2 = new Map()
  for (const country of catalog) {
    const qid = sitelinks[country.iso2]?.wikidataId
    if (qid) qidByIso2.set(country.iso2, qid)
  }
  const uniqueQids = [...new Set(qidByIso2.values())]
  const demonymByQid = new Map()
  const currencyLabelByQid = new Map()

  for (let i = 0; i < uniqueQids.length; i += BATCH_SIZE) {
    const batch = uniqueQids.slice(i, i + BATCH_SIZE)
    const url = new URL(WIKIDATA_API)
    url.searchParams.set('action', 'wbgetentities')
    url.searchParams.set('ids', batch.join('|'))
    url.searchParams.set('props', 'claims|labels')
    url.searchParams.set('languages', 'es|en')
    url.searchParams.set('format', 'json')
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`Wikidata HTTP ${response.status}`)
    }
    const data = await response.json()
    for (const qid of batch) {
      const entity = data.entities?.[qid]
      if (!entity) continue
      const demonymClaims = entity.claims?.P1549 ?? []
      const demonyms = []
      for (const claim of demonymClaims) {
        const monolingual = claim?.mainsnak?.datavalue?.value
        if (
          monolingual &&
          typeof monolingual.text === 'string' &&
          (monolingual.language === 'es' || monolingual.language === 'en')
        ) {
          demonyms.push({ locale: monolingual.language, text: monolingual.text })
        }
      }
      demonymByQid.set(qid, demonyms)

      const currencyQid = entity.claims?.P38?.[0]?.mainsnak?.datavalue?.value?.id
      if (currencyQid) {
        currencyLabelByQid.set(qid, currencyQid)
      }
    }
    if (i + BATCH_SIZE < uniqueQids.length) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  const allCurrencyQids = [...new Set(currencyLabelByQid.values())]
  const currencyLabelsByQid = new Map()
  for (let i = 0; i < allCurrencyQids.length; i += BATCH_SIZE) {
    const batch = allCurrencyQids.slice(i, i + BATCH_SIZE)
    const url = new URL(WIKIDATA_API)
    url.searchParams.set('action', 'wbgetentities')
    url.searchParams.set('ids', batch.join('|'))
    url.searchParams.set('props', 'labels')
    url.searchParams.set('languages', 'es|en')
    url.searchParams.set('format', 'json')
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`Wikidata HTTP ${response.status}`)
    }
    const data = await response.json()
    for (const qid of batch) {
      const entity = data.entities?.[qid]
      currencyLabelsByQid.set(qid, {
        es: entity?.labels?.es?.value,
        en: entity?.labels?.en?.value,
      })
    }
    if (i + BATCH_SIZE < allCurrencyQids.length) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  return { demonymByQid, currencyLabelByQid, currencyLabelsByQid, qidByIso2 }
}

function buildEntryForIso2(country, sitelinks, capitalEsMap, enrichment) {
  const iso2 = country.iso2
  const sitelinkEntry = sitelinks[iso2] ?? {}
  const titles = sitelinkEntry.titles ?? {}

  const esTerms = new Set()
  const enTerms = new Set()

  const enAliases = [...getAliasesForLocale(iso2, 'en'), country.name, titles.en]
  for (const alias of enAliases) {
    const normalized = normalizeTerm(alias)
    if (normalized) enTerms.add(normalized)
  }

  const esAliases = [...getAliasesForLocale(iso2, 'es'), titles.es, country.name]
  for (const alias of esAliases) {
    const normalized = normalizeTerm(alias)
    if (normalized) esTerms.add(normalized)
  }

  const capitalEn = normalizeTerm(country.capital)
  if (capitalEn) enTerms.add(capitalEn)
  const capitalEs = normalizeTerm(capitalEsMap[iso2] ?? country.capital)
  if (capitalEs) esTerms.add(capitalEs)

  if (enrichment) {
    const qid = enrichment.qidByIso2.get(iso2)
    if (qid) {
      const demonyms = enrichment.demonymByQid.get(qid) ?? []
      for (const demonym of demonyms) {
        const normalized = normalizeTerm(demonym.text)
        if (!normalized) continue
        if (demonym.locale === 'es') esTerms.add(normalized)
        if (demonym.locale === 'en') enTerms.add(normalized)
      }
      const currencyQid = enrichment.currencyLabelByQid.get(qid)
      if (currencyQid) {
        const labels = enrichment.currencyLabelsByQid.get(currencyQid) ?? {}
        const labelEs = normalizeTerm(labels.es)
        const labelEn = normalizeTerm(labels.en)
        if (labelEs) esTerms.add(labelEs)
        if (labelEn) enTerms.add(labelEn)
      }
    }
  }

  return {
    es: [...esTerms].sort((a, b) => a.localeCompare(b, 'es')),
    en: [...enTerms].sort((a, b) => a.localeCompare(b, 'en')),
  }
}

async function main() {
  const wantsEnrich = process.argv.includes('--enrich')
  const catalog = await loadJson(catalogPath)
  const sitelinks = await loadJson(sitelinksPath)
  const capitalEsMap = await loadJson(capitalEsPath)

  let enrichment = null
  if (wantsEnrich) {
    console.log('[build-country-forbidden-terms] Enriching with Wikidata (demonym, currency)...')
    enrichment = await maybeEnrichWithWikidata(catalog, sitelinks)
  } else {
    console.log('[build-country-forbidden-terms] Offline mode (catalog + sitelinks + i18n-iso-countries).')
  }

  const sortedCatalog = [...catalog].sort((a, b) => a.iso2.localeCompare(b.iso2))
  const output = {}
  const incomplete = []
  for (const country of sortedCatalog) {
    const entry = buildEntryForIso2(country, sitelinks, capitalEsMap, enrichment)
    if (entry.es.length === 0 || entry.en.length === 0) {
      incomplete.push(country.iso2)
    }
    output[country.iso2] = entry
  }

  if (incomplete.length > 0) {
    console.error('[build-country-forbidden-terms] Empty terms for:', incomplete.join(', '))
    process.exit(1)
  }

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(
    `[build-country-forbidden-terms] Wrote ${sortedCatalog.length} entries to ${outputPath}`,
  )
}

main().catch((error) => {
  console.error('[build-country-forbidden-terms] Failed:', error)
  process.exit(1)
})
