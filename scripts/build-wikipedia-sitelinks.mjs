/**
 * Generates shared/wikipedia-sitelinks.json from countries-catalog.json via Wikidata.
 * Requires network. Run: node scripts/build-wikipedia-sitelinks.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const USER_AGENT =
  'MapWorldGame/1.0 (https://github.com/negrolio/the-map-world-game-2026; map-world-game-dev@users.noreply.github.com)'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const WIKIDATA_SPARQL = 'https://query.wikidata.org/sparql'
const BATCH_SIZE = 50
const REQUEST_DELAY_MS = 150

const root = resolve(import.meta.dirname, '..')
const catalogPath = resolve(root, 'src/data/countries-catalog.json')
const outputPath = resolve(root, 'shared/wikipedia-sitelinks.json')
const exceptionsPath = resolve(root, 'shared/wikipedia-sitelinks-exceptions.json')

async function loadJson(path) {
  const raw = await readFile(path, 'utf8')
  return JSON.parse(raw)
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms)
  })
}

async function wikidataGet(params) {
  const url = new URL(WIKIDATA_API)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`Wikidata HTTP ${response.status}`)
  }
  return response.json()
}

async function resolveQidsByIso2(iso2List) {
  const values = iso2List.map((iso2) => `"${iso2}"`).join(' ')
  const query = `
SELECT ?iso2 ?item WHERE {
  ?item wdt:P297 ?iso2 .
  VALUES ?iso2 { ${values} }
}
`.trim()

  const url = new URL(WIKIDATA_SPARQL)
  url.searchParams.set('format', 'json')
  url.searchParams.set('query', query)

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
  })
  if (!response.ok) {
    throw new Error(`Wikidata SPARQL HTTP ${response.status}`)
  }

  const data = await response.json()
  const map = new Map()
  for (const binding of data.results?.bindings ?? []) {
    const iso2 = binding.iso2?.value
    const itemUri = binding.item?.value
    const qid = itemUri?.match(/(Q\d+)$/)?.[1]
    if (iso2 && qid) {
      map.set(iso2, qid)
    }
  }
  return map
}

async function fetchSitelinksForQids(qids) {
  const data = await wikidataGet({
    action: 'wbgetentities',
    ids: qids.join('|'),
    props: 'sitelinks',
    format: 'json',
  })

  const result = new Map()
  for (const qid of qids) {
    const entity = data.entities?.[qid]
    const sitelinks = entity?.sitelinks ?? {}
    result.set(qid, {
      en: sitelinks.enwiki?.title,
      es: sitelinks.eswiki?.title,
    })
  }
  return result
}

async function main() {
  const catalog = await loadJson(catalogPath)
  const iso2List = catalog.map((c) => c.iso2).sort()

  let exceptions = {}
  try {
    exceptions = await loadJson(exceptionsPath)
  } catch {
    // optional file
  }

  console.log(`[build-wikipedia-sitelinks] Resolving QIDs via SPARQL for ${iso2List.length} countries...`)
  const qidByIso2 = await resolveQidsByIso2(iso2List)

  for (const iso2 of iso2List) {
    if (exceptions[iso2]?.wikidataId) {
      qidByIso2.set(iso2, exceptions[iso2].wikidataId)
    }
  }

  const missing = iso2List.filter((iso2) => !qidByIso2.has(iso2))
  if (missing.length > 0) {
    console.error('[build-wikipedia-sitelinks] No Wikidata QID for:', missing.join(', '))
    process.exit(1)
  }

  const uniqueQids = [...new Set(qidByIso2.values())]
  console.log(`[build-wikipedia-sitelinks] Fetching sitelinks for ${uniqueQids.length} entities...`)

  const sitelinksByQid = new Map()
  for (let i = 0; i < uniqueQids.length; i += BATCH_SIZE) {
    const batch = uniqueQids.slice(i, i + BATCH_SIZE)
    const batchLinks = await fetchSitelinksForQids(batch)
    for (const [qid, links] of batchLinks) {
      sitelinksByQid.set(qid, links)
    }
    if (i + BATCH_SIZE < uniqueQids.length) {
      await sleep(REQUEST_DELAY_MS)
    }
  }

  const output = {}
  const incomplete = []

  for (const iso2 of iso2List) {
    const qid = qidByIso2.get(iso2)
    const exceptionEntry = exceptions[iso2]
    const fromWikidata = sitelinksByQid.get(qid) ?? {}
    const titles = {
      en: exceptionEntry?.titles?.en ?? fromWikidata.en,
      es: exceptionEntry?.titles?.es ?? fromWikidata.es,
    }

    if (!titles.en || !titles.es) {
      incomplete.push({ iso2, qid, titles })
    }

    output[iso2] = {
      wikidataId: qid,
      titles,
    }
  }

  if (incomplete.length > 0) {
    console.error('[build-wikipedia-sitelinks] Missing en/es sitelink for:')
    for (const entry of incomplete) {
      console.error(`  ${entry.iso2} (${entry.qid}): en=${entry.titles.en ?? '—'} es=${entry.titles.es ?? '—'}`)
    }
    console.error('Add manual overrides to shared/wikipedia-sitelinks-exceptions.json and re-run.')
    process.exit(1)
  }

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(`[build-wikipedia-sitelinks] Wrote ${iso2List.length} entries to ${outputPath}`)
}

main().catch((error) => {
  console.error('[build-wikipedia-sitelinks] Failed:', error)
  process.exit(1)
})
