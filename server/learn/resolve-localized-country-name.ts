import { createRequire } from 'node:module'
import type { LocaleData } from 'i18n-iso-countries'

import type { AppLocale } from '../../shared/app-locale.js'

const require = createRequire(import.meta.url)

const countries = require('i18n-iso-countries') as {
  registerLocale: (locale: LocaleData) => void
  getName: (iso2: string, locale: string) => string | undefined
}

let localesRegistered = false

function ensureLocalesRegistered(): void {
  if (localesRegistered) {
    return
  }
  countries.registerLocale(require('i18n-iso-countries/langs/es.json') as LocaleData)
  countries.registerLocale(require('i18n-iso-countries/langs/en.json') as LocaleData)
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
