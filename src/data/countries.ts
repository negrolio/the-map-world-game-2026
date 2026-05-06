import type { IsoCountryCode, RegionFilter } from '../types'

export interface CountryRecord {
  readonly iso2: IsoCountryCode
  readonly iso3: string
  readonly name: string
  readonly continent: Exclude<RegionFilter, 'world'>
  readonly capital: string
}

export const countriesCatalog: readonly CountryRecord[] = [
  { iso2: 'AR', iso3: 'ARG', name: 'Argentina', continent: 'americas', capital: 'Buenos Aires' },
  { iso2: 'BR', iso3: 'BRA', name: 'Brazil', continent: 'americas', capital: 'Brasilia' },
  { iso2: 'FR', iso3: 'FRA', name: 'France', continent: 'europe', capital: 'Paris' },
  { iso2: 'DE', iso3: 'DEU', name: 'Germany', continent: 'europe', capital: 'Berlin' },
  { iso2: 'NG', iso3: 'NGA', name: 'Nigeria', continent: 'africa', capital: 'Abuja' },
  { iso2: 'ZA', iso3: 'ZAF', name: 'South Africa', continent: 'africa', capital: 'Pretoria' },
  { iso2: 'JP', iso3: 'JPN', name: 'Japan', continent: 'asia', capital: 'Tokyo' },
  { iso2: 'IN', iso3: 'IND', name: 'India', continent: 'asia', capital: 'New Delhi' },
  { iso2: 'AU', iso3: 'AUS', name: 'Australia', continent: 'oceania', capital: 'Canberra' },
  { iso2: 'NZ', iso3: 'NZL', name: 'New Zealand', continent: 'oceania', capital: 'Wellington' },
] as const
