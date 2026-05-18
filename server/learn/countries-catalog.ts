import countriesCatalogJson from '../../src/data/countries-catalog.json'

export interface CatalogCountry {
  readonly iso2: string
  readonly iso3: string
  readonly name: string
  readonly continent: string
  readonly capital: string
}

export const countriesCatalog = countriesCatalogJson as readonly CatalogCountry[]

const iso2Index = new Map<string, CatalogCountry>(
  countriesCatalog.map((country) => [country.iso2, country]),
)

export function findCountryByIso2(iso2: string): CatalogCountry | undefined {
  return iso2Index.get(iso2)
}
