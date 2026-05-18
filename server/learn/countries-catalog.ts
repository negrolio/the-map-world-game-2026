import { createRequire } from 'node:module'

export interface CatalogCountry {
  readonly iso2: string
  readonly iso3: string
  readonly name: string
  readonly continent: string
  readonly capital: string
}

const require = createRequire(import.meta.url)

const countriesCatalogJson = require('../../src/data/countries-catalog.json') as readonly CatalogCountry[]

export const countriesCatalog = countriesCatalogJson

const iso2Index = new Map<string, CatalogCountry>(
  countriesCatalog.map((country) => [country.iso2, country]),
)

export function findCountryByIso2(iso2: string): CatalogCountry | undefined {
  return iso2Index.get(iso2)
}
