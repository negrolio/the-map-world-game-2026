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

export type ContinentCode = Exclude<RegionFilter, 'world'>

const continentByIso2 = new Map<IsoCountryCode, ContinentCode>()
for (const row of countriesCatalog) {
  continentByIso2.set(row.iso2, row.continent)
}

/** Resuelve el continente del catálogo para un ISO2, o `undefined` si no está catalogado. */
export function getContinentForIso2(iso2: string | undefined): ContinentCode | undefined {
  if (!iso2) {
    return undefined
  }
  return continentByIso2.get(iso2 as IsoCountryCode)
}
