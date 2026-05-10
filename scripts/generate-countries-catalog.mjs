/**
 * Genera src/data/countries-catalog.json a partir de:
 * - world-atlas countries-110m (node_modules)
 * - JSON de REST Countries v3.1 (ruta pasada por argv)
 *
 * Uso: node ./scripts/generate-countries-catalog.mjs /path/to/restcountries.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '..')

const rcPath = process.argv[2]
if (!rcPath) {
  console.error('Usage: node ./scripts/generate-countries-catalog.mjs <restcountries.json>')
  process.exit(1)
}

const topoPath = resolve(root, 'node_modules/world-atlas/countries-110m.json')
const isoTsPath = resolve(root, 'src/data/iso3166-numeric-to-alpha2.ts')
const outPath = resolve(root, 'src/data/countries-catalog.json')

const topo = JSON.parse(readFileSync(topoPath, 'utf8'))
const rc = JSON.parse(readFileSync(rcPath, 'utf8'))

const isoTs = readFileSync(isoTsPath, 'utf8')
const numericToAlpha2 = {}
for (const m of isoTs.matchAll(/'(\d{3})':\s*'([A-Z]{2})'/g)) {
  numericToAlpha2[m[1]] = m[2]
}

const NAME_TO_ISO2 = { Kosovo: 'XK' }

function readIso2FromProps(props) {
  if (!props) return undefined
  const isoRaw = props['ISO_A2']
  if (typeof isoRaw !== 'string') return undefined
  const t = isoRaw.trim().toUpperCase()
  if (t === '' || t === '-99') return undefined
  return t
}

function alpha2FromNumeric(id) {
  if (id === undefined || id === null || id === '') return undefined
  const key = String(id).padStart(3, '0')
  return numericToAlpha2[key]
}

function resolveIso2(props, id) {
  const fromP = readIso2FromProps(props)
  if (fromP) return fromP
  const fromN = alpha2FromNumeric(id)
  if (fromN) return fromN
  const nameRaw = props?.name
  if (typeof nameRaw === 'string' && NAME_TO_ISO2[nameRaw]) {
    return NAME_TO_ISO2[nameRaw]
  }
  return null
}

const rcByCca2 = {}
for (const c of rc) {
  if (c.cca2) rcByCca2[c.cca2] = c
}

function mapRegionToContinent(region, iso2) {
  if (region === 'Antarctic') return null
  const r = {
    Africa: 'africa',
    Americas: 'americas',
    Asia: 'asia',
    Europe: 'europe',
    Oceania: 'oceania',
  }[region]
  if (r) return r
  if (iso2 === 'TW') return 'asia'
  return null
}

const geometries = topo.objects?.countries?.geometries ?? []
const catalog = []
const skipped = []

for (const g of geometries) {
  const id = g.id
  const props = g.properties
  const iso2 = resolveIso2(props, id)
  if (!iso2) {
    skipped.push({ id, name: props?.name })
    continue
  }
  const meta = rcByCca2[iso2]
  if (!meta) {
    skipped.push({ iso2, id, reason: 'no restcountries' })
    continue
  }
  const continent = mapRegionToContinent(meta.region, iso2)
  if (!continent) {
    skipped.push({ iso2, region: meta.region })
    continue
  }
  const nameCommon = meta.name?.common
  if (!nameCommon) {
    skipped.push({ iso2, reason: 'no name' })
    continue
  }
  const capital = Array.isArray(meta.capital) && meta.capital[0] ? meta.capital[0] : nameCommon
  const iso3 = meta.cca3 || iso2
  catalog.push({
    iso2,
    iso3,
    name: nameCommon,
    continent,
    capital,
  })
}

catalog.sort((a, b) => a.iso2.localeCompare(b.iso2))

writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
console.log(`Wrote ${catalog.length} rows to ${outPath}`)
console.log(`Skipped ${skipped.length}:`, JSON.stringify(skipped, null, 2))
