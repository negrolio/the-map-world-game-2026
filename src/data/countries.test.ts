import { describe, expect, it } from 'vitest'

import { countriesCatalog, getContinentForIso2, type CountryRecord } from './countries'

const VALID_CONTINENTS = new Set<CountryRecord['continent']>([
  'africa',
  'americas',
  'asia',
  'europe',
  'oceania',
])

describe('getContinentForIso2', () => {
  it('resuelve continente desde el catalogo', () => {
    expect(getContinentForIso2('DE')).toBe('europe')
    expect(getContinentForIso2('AR')).toBe('americas')
  })

  it('devuelve undefined para ISO desconocido', () => {
    expect(getContinentForIso2('ZZ')).toBeUndefined()
    expect(getContinentForIso2(undefined)).toBeUndefined()
  })
})

describe('countriesCatalog', () => {
  it('tiene cobertura amplia respecto al MVP reducido', () => {
    expect(countriesCatalog.length).toBeGreaterThan(50)
  })

  it('cada fila tiene iso2/iso3 unicos y continente valido', () => {
    const seenIso2 = new Set<string>()

    for (const row of countriesCatalog) {
      expect(row.iso2, `iso2 invalido: ${row.iso2}`).toMatch(/^[A-Z]{2}$/)
      expect(row.iso3, `iso3 invalido: ${row.iso3}`).toMatch(/^[A-Z]{3}$/)
      expect(VALID_CONTINENTS.has(row.continent), `continente: ${row.continent}`).toBe(true)
      expect(row.name.length, `name vacio ${row.iso2}`).toBeGreaterThan(0)
      expect(row.capital.length, `capital vacio ${row.iso2}`).toBeGreaterThan(0)
      expect(seenIso2.has(row.iso2), `duplicado iso2 ${row.iso2}`).toBe(false)
      seenIso2.add(row.iso2)
    }
  })
})
