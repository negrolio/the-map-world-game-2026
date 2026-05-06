import { describe, expect, it } from 'vitest'

import {
  readIso2FromTopologyProperties,
  resolveCatalogIso2OrNull,
  resolveCountryClickFromTopologyProperties,
} from './topology-country-click'

describe('topology-country-click', () => {
  const catalog = new Set(['AR', 'FR', 'JP'])

  describe('readIso2FromTopologyProperties', () => {
    it('lee ISO_A2 válido en mayúsculas', () => {
      expect(readIso2FromTopologyProperties({ ISO_A2: 'AR' })).toBe('AR')
    })

    it('normaliza espacios y mayúsculas', () => {
      expect(readIso2FromTopologyProperties({ ISO_A2: ' fr ' })).toBe('FR')
    })

    it('trata -99 como ausente', () => {
      expect(readIso2FromTopologyProperties({ ISO_A2: '-99' })).toBeUndefined()
    })

    it('devuelve undefined si falta o no es string', () => {
      expect(readIso2FromTopologyProperties({})).toBeUndefined()
      expect(readIso2FromTopologyProperties({ ISO_A2: 1 })).toBeUndefined()
      expect(readIso2FromTopologyProperties(undefined)).toBeUndefined()
    })
  })

  describe('resolveCatalogIso2OrNull', () => {
    it('acepta código presente en catálogo', () => {
      expect(resolveCatalogIso2OrNull('AR', catalog)).toBe('AR')
    })

    it('rechaza código fuera del catálogo', () => {
      expect(resolveCatalogIso2OrNull('US', catalog)).toBeNull()
    })

    it('rechaza candidato ausente', () => {
      expect(resolveCatalogIso2OrNull(undefined, catalog)).toBeNull()
    })
  })

  describe('resolveCountryClickFromTopologyProperties', () => {
    it('devuelve el ISO del TopoJSON aunque no esté en el catálogo del juego', () => {
      expect(resolveCountryClickFromTopologyProperties({ ISO_A2: 'US' })).toBe('US')
    })

    it('coincide con readIso2FromTopologyProperties cuando hay ISO válido', () => {
      expect(resolveCountryClickFromTopologyProperties({ ISO_A2: 'AR' })).toBe('AR')
    })

    it('devuelve null cuando no hay ISO usable en la geometría', () => {
      expect(resolveCountryClickFromTopologyProperties({ ISO_A2: '-99' })).toBeNull()
      expect(resolveCountryClickFromTopologyProperties(undefined)).toBeNull()
    })

    it('resuelve por id numérico ISO (world-atlas) cuando no hay ISO_A2 en propiedades', () => {
      expect(resolveCountryClickFromTopologyProperties({ name: 'France' }, 250)).toBe('FR')
      expect(resolveCountryClickFromTopologyProperties({ name: 'United States of America' }, 840)).toBe(
        'US',
      )
    })

    it('resuelve Kosovo por nombre cuando no hay id numérico', () => {
      expect(resolveCountryClickFromTopologyProperties({ name: 'Kosovo' })).toBe('XK')
    })
  })
})
