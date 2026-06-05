import { neighbors } from 'topojson-client'
import { describe, expect, it } from 'vitest'
import topo from 'world-atlas/countries-110m.json'

import {
  MAP_ACTIVE_CONTINENT_TONES,
  MAP_DEFAULT_TONES,
} from '../components/world-map-palette'
import { ISO_3166_NUMERIC_TO_ALPHA2 } from './iso3166-numeric-to-alpha2'
import { COUNTRY_TONE_COUNT } from './country-tones'
import countryTonesData from './country-tones.json'

const NAME_TO_ISO2: Readonly<Record<string, string>> = { Kosovo: 'XK' }

function readIso2FromProps(props: { ISO_A2?: string } | null | undefined): string | undefined {
  if (!props) return undefined
  const isoRaw = props['ISO_A2']
  if (typeof isoRaw !== 'string') return undefined
  const t = isoRaw.trim().toUpperCase()
  if (t === '' || t === '-99') return undefined
  return t
}

function alpha2FromNumeric(id: string | number | undefined): string | undefined {
  if (id === undefined || id === null || id === '') return undefined
  const key = String(id).padStart(3, '0')
  return ISO_3166_NUMERIC_TO_ALPHA2[key]
}

function iso2OfGeometry(geo: {
  id?: string | number
  properties?: Record<string, unknown>
}): string | null {
  const props = geo.properties as { ISO_A2?: string; name?: string } | undefined
  const fromP = readIso2FromProps(props)
  if (fromP) return fromP
  const fromN = alpha2FromNumeric(geo.id)
  if (fromN) return fromN
  const nameRaw = props?.name
  if (typeof nameRaw === 'string' && NAME_TO_ISO2[nameRaw]) {
    return NAME_TO_ISO2[nameRaw]
  }
  return null
}

function buildLandBorderEdges(): Array<[string, string]> {
  const geometries = topo.objects.countries.geometries
  const adjIdx = neighbors(geometries)
  const idxToIso2 = geometries.map((geo) => iso2OfGeometry(geo))

  const edges: Array<[string, string]> = []
  const seen = new Set<string>()

  for (let i = 0; i < adjIdx.length; i += 1) {
    const isoI = idxToIso2[i]
    if (!isoI) continue
    for (const j of adjIdx[i]) {
      const isoJ = idxToIso2[j]
      if (!isoJ || isoI === isoJ) continue
      const key = [isoI, isoJ].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([isoI, isoJ])
    }
  }

  return edges
}

describe('country-tones invariant', () => {
  it('ningún par limítrofe comparte toneIndex', () => {
    const tones = countryTonesData.tones
    const edges = buildLandBorderEdges()

    expect(edges.length).toBeGreaterThan(0)

    for (const [a, b] of edges) {
      const toneA = tones[a as keyof typeof tones]
      const toneB = tones[b as keyof typeof tones]
      if (toneA === undefined || toneB === undefined) continue
      expect(toneA, `limítrofes ${a}/${b} comparten tono ${toneA}`).not.toBe(toneB)
    }
  })

  it('toneCount declarado coincide con max(tones)+1', () => {
    const tones = Object.values(countryTonesData.tones)
    const maxTone = tones.length > 0 ? Math.max(...tones) : -1
    expect(countryTonesData.toneCount).toBe(maxTone + 1)
    expect(COUNTRY_TONE_COUNT).toBe(countryTonesData.toneCount)
  })

  it('hay suficientes variantes de paleta para toneCount', () => {
    expect(MAP_DEFAULT_TONES.length).toBeGreaterThanOrEqual(countryTonesData.toneCount)
    expect(MAP_ACTIVE_CONTINENT_TONES.length).toBeGreaterThanOrEqual(countryTonesData.toneCount)
  })
})
