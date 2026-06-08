import { writeFileSync, readFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoMercator, geoPath } from 'd3-geo'

const topo = JSON.parse(
  readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)),
)

const fc = feature(topo, topo.objects.countries)
// Argentina ISO numeric = 032
const argentina = fc.features.find(
  (f) =>
    String(f.id) === '32' ||
    String(f.id) === '032' ||
    /argentina/i.test(String(f.properties?.name ?? '')),
)
if (!argentina) {
  throw new Error('Argentina not found in topology')
}

const size = 512
const padding = 56
const projection = geoMercator().fitExtent(
  [
    [padding, padding],
    [size - padding, size - padding],
  ],
  argentina,
)
// Redondea cada número del path a 1 decimal para reducir el tamaño del archivo.
const rawPath = geoPath(projection)(argentina)
const d = rawPath.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 10) / 10))

// Paleta del juego (tokens.css): fondo pergamino + silueta en madera oscura,
// evocando el mapa antiguo del tema visual.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#f4e4bc"/>
  <path d="${d}" fill="#2d1e0f" stroke="#4a3219" stroke-width="8" stroke-linejoin="round"/>
</svg>
`

writeFileSync(new URL('../public/favicon.svg', import.meta.url), svg)
console.log('favicon.svg written, path length:', d.length)
