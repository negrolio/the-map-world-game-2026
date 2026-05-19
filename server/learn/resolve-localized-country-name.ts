import { getCountryDisplayName } from '../../shared/country-display-name.js'
import type { AppLocale } from '../../shared/app-locale.js'

export function resolveLocalizedCountryName(
  country: { readonly iso2: string; readonly name: string },
  locale: AppLocale,
): string {
  return getCountryDisplayName(country.iso2, country.name, locale)
}
