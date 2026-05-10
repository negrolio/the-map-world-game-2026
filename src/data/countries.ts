import type { IsoCountryCode, RegionFilter } from '../types'

import countriesCatalogJson from './countries-catalog.json'

/**
 * Catálogo amplio alineado a `world-atlas/countries-110m` + resolución de clics.
 * Ver docs: `docs/tasks/map-game-ux-and-data/04-catalogo-fuente-y-versionado.md`
 */
export interface CountryRecord {
  readonly iso2: IsoCountryCode
  readonly iso3: string
  readonly name: string
  readonly continent: Exclude<RegionFilter, 'world'>
  readonly capital: string
}

export const countriesCatalog = countriesCatalogJson as readonly CountryRecord[]
