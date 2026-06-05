/**
 * Genera src/data/country-tones.json a partir de:
 * - world-atlas countries-110m (node_modules)
 * - adyacencia vía topojson-client.neighbors()
 * - coloreo greedy Welsh–Powell (iso2 → toneIndex)
 *
 * Uso: node ./scripts/build-country-tones.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { neighbors } from 'topojson-client'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(__dirname, '..')

/** Debe coincidir con MAP_DEFAULT_TONES.length en world-map-palette.ts */
const MAX_PALETTE_VARIANTS = 5

const topoPath = resolve(root, 'node_modules/world-atlas/countries-110m.json')
const isoTsPath = resolve(root, 'src/data/iso3166-numeric-to-alpha2.ts')
const outPath = resolve(root, 'src/data/country-tones.json')

const topo = JSON.parse(readFileSync(topoPath, 'utf8'))

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

function iso2OfGeometry(geo) {
  const fromP = readIso2FromProps(geo.properties)
  if (fromP) return fromP
  const fromN = alpha2FromNumeric(geo.id)
  if (fromN) return fromN
  const nameRaw = geo.properties?.name
  if (typeof nameRaw === 'string' && NAME_TO_ISO2[nameRaw]) {
    return NAME_TO_ISO2[nameRaw]
  }
  return null
}

const geometries = topo.objects?.countries?.geometries ?? []
const adjIdx = neighbors(geometries)

/** idx → iso2 (null si no resuelve) */
const idxToIso2 = geometries.map((geo) => iso2OfGeometry(geo))

const skipped = []
for (let i = 0; i < geometries.length; i += 1) {
  if (!idxToIso2[i]) {
    skipped.push({ id: geometries[i].id, name: geometries[i].properties?.name })
  }
}

/** Grafo no dirigido en espacio iso2: iso2 → Set<iso2> */
const adjacency = new Map()

function addEdge(isoA, isoB) {
  if (!adjacency.has(isoA)) adjacency.set(isoA, new Set())
  if (!adjacency.has(isoB)) adjacency.set(isoB, new Set())
  adjacency.get(isoA).add(isoB)
  adjacency.get(isoB).add(isoA)
}

for (let i = 0; i < adjIdx.length; i += 1) {
  const isoI = idxToIso2[i]
  if (!isoI) continue
  for (const j of adjIdx[i]) {
    const isoJ = idxToIso2[j]
    if (!isoJ || isoI === isoJ) continue
    addEdge(isoI, isoJ)
  }
}

/**
 * Coloreo greedy Welsh–Powell: grado desc, desempate alfabético por iso2.
 * @returns {Record<string, number>}
 */
function greedyWelshPowellColoring(graph) {
  const nodes = [...graph.keys()].sort((a, b) => {
    const degA = graph.get(a)?.size ?? 0
    const degB = graph.get(b)?.size ?? 0
    if (degB !== degA) return degB - degA
    return a.localeCompare(b)
  })

  /** @type {Record<string, number>} */
  const colors = {}

  for (const node of nodes) {
    const neighborColors = new Set()
    for (const neighbor of graph.get(node) ?? []) {
      if (colors[neighbor] !== undefined) {
        neighborColors.add(colors[neighbor])
      }
    }
    let toneIndex = 0
    while (neighborColors.has(toneIndex)) {
      toneIndex += 1
    }
    colors[node] = toneIndex
  }

  return colors
}

const rawColors = greedyWelshPowellColoring(adjacency)
const toneCount = Math.max(...Object.values(rawColors), -1) + 1

/** Ordenar tones por clave para diffs estables */
const sortedKeys = Object.keys(rawColors).sort((a, b) => a.localeCompare(b))
/** @type {Record<string, number>} */
const tones = {}
for (const key of sortedKeys) {
  tones[key] = rawColors[key]
}

if (toneCount > MAX_PALETTE_VARIANTS) {
  console.error(
    `[build-country-tones] toneCount=${toneCount} excede MAX_PALETTE_VARIANTS=${MAX_PALETTE_VARIANTS}.`,
  )
  console.error(
    `[build-country-tones] Agregar ${toneCount - MAX_PALETTE_VARIANTS} variantes a world-map-palette.ts (MAP_DEFAULT_TONES / MAP_ACTIVE_CONTINENT_TONES).`,
  )
  process.exit(1)
}

const output = {
  version: 1,
  toneCount,
  tones,
}

writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(`[build-country-tones] Wrote ${Object.keys(tones).length} countries to ${outPath}`)
console.log(`[build-country-tones] toneCount=${toneCount}`)
if (skipped.length > 0) {
  console.log(`[build-country-tones] Skipped ${skipped.length} geometries without iso2:`)
  for (const s of skipped) {
    console.log(`  - id=${s.id} name=${s.name ?? '(unknown)'}`)
  }
}
