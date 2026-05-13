import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import esLocale from 'i18n-iso-countries/langs/es.json'
import type { LocaleData } from 'i18n-iso-countries'

import type { AppLocale } from '../i18n/app-locale'
import type { CountryRecord } from './countries'

import capitalEsMap from './capital-es-map.json'

const capitalEsByIso2 = capitalEsMap as Readonly<Record<string, string>>

let localesRegistered = false

function ensureLocalesRegistered(): void {
  if (localesRegistered) {
    return
  }
  countries.registerLocale(esLocale as LocaleData)
  countries.registerLocale(enLocale as LocaleData)
  localesRegistered = true
}

/** Nombre de país visible según locale (catálogo EN + i18n-iso-countries para `es`). */
export function getLocalizedCountryName(country: CountryRecord, locale: AppLocale): string {
  ensureLocalesRegistered()
  if (locale === 'en') {
    return country.name
  }
  return countries.getName(country.iso2, 'es') ?? country.name
}

/** Capital visible según locale (mapa ES curado + inglés del catálogo como base). */
export function getLocalizedCapital(country: CountryRecord, locale: AppLocale): string {
  if (locale === 'en') {
    return country.capital
  }
  return capitalEsByIso2[country.iso2] ?? country.capital
}
