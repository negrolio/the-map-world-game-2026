import { getCountryDisplayName } from '../../shared/country-display-name'

import type { AppLocale } from '../i18n/app-locale'
import type { CountryRecord } from './countries'

import capitalEsMap from './capital-es-map.json'

const capitalEsByIso2 = capitalEsMap as Readonly<Record<string, string>>

/** Nombre de país visible según locale (i18n-iso-countries; catálogo como fallback). */
export function getLocalizedCountryName(country: CountryRecord, locale: AppLocale): string {
  return getCountryDisplayName(country.iso2, country.name, locale)
}

/** Capital visible según locale (mapa ES curado + inglés del catálogo como base). */
export function getLocalizedCapital(country: CountryRecord, locale: AppLocale): string {
  if (locale === 'en') {
    return country.capital
  }
  return capitalEsByIso2[country.iso2] ?? country.capital
}
