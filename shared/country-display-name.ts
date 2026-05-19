import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json' with { type: 'json' }
import esLocale from 'i18n-iso-countries/langs/es.json' with { type: 'json' }
import type { LocaleData } from 'i18n-iso-countries'

import type { AppLocale } from './app-locale.js'

let localesRegistered = false

function ensureLocalesRegistered(): void {
  if (localesRegistered) {
    return
  }
  countries.registerLocale(esLocale as LocaleData)
  countries.registerLocale(enLocale as LocaleData)
  localesRegistered = true
}

/** Nombre de país visible según locale (i18n-iso-countries; catálogo como fallback). */
export function getCountryDisplayName(
  iso2: string,
  catalogName: string,
  locale: AppLocale,
): string {
  ensureLocalesRegistered()
  return countries.getName(iso2, locale) ?? catalogName
}
