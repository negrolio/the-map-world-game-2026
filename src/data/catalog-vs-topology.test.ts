import { describe, expect, it } from 'vitest'

import topology from 'world-atlas/countries-110m.json'

import { countriesCatalog } from './countries'
import { resolveCountryClickFromTopologyProperties } from '../services/topology-country-click'

describe('catalogo vs TopoJSON world-atlas 110m', () => {
  it('cada iso2 del catalogo es resoluble como en WorldMap (properties + id)', () => {
    const geometries = topology.objects.countries.geometries
    const resolvableFromMap = new Set<string>()

    for (const geometry of geometries) {
      const iso2 = resolveCountryClickFromTopologyProperties(geometry.properties, geometry.id)
      if (iso2) {
        resolvableFromMap.add(iso2)
      }
    }

    const missing: string[] = []
    for (const country of countriesCatalog) {
      if (!resolvableFromMap.has(country.iso2)) {
        missing.push(country.iso2)
      }
    }

    expect(missing, `ISO2 en catalogo sin resolucion en topologia: ${missing.join(', ')}`).toEqual([])
  })
})
