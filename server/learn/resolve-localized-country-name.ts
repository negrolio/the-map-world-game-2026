import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import esLocale from 'i18n-iso-countries/langs/es.json'
import type { LocaleData } from 'i18n-iso-countries'

import type { AppLocale } from '../../shared/app-locale'

let localesRegistered = false

function ensureLocalesRegistered(): void {
  if (localesRegistered) {
    return
  }
  countries.registerLocale(esLocale as LocaleData)
  countries.registerLocale(enLocale as LocaleData)
  localesRegistered = true
}

/** Mismo algoritmo que `src/data/country-localization.ts` (sin React). */
export function resolveLocalizedCountryName(
  country: { readonly iso2: string; readonly name: string },
  locale: AppLocale,
): string {
  ensureLocalesRegistered()
  if (locale === 'en') {
    return country.name
  }
  return countries.getName(country.iso2, 'es') ?? country.name
}
