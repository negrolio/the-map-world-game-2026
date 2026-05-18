import { isAppLocale } from '../../shared/app-locale'
import type { AppLocale } from '../../shared/app-locale'
import { learnFailure, type LearnResult } from '../../shared/learn-types'
import { findCountryByIso2, type CatalogCountry } from './countries-catalog'

export interface ValidatedLearnRequest {
  readonly iso2: string
  readonly locale: AppLocale
  readonly country: CatalogCountry
}

export function normalizeIso2(iso2Raw: string): string {
  return iso2Raw.trim().toUpperCase()
}

export function validateLearnRequest(
  iso2Raw: string,
  localeRaw: string,
): LearnResult<ValidatedLearnRequest> {
  const locale = localeRaw.trim().toLowerCase()
  if (!isAppLocale(locale)) {
    return learnFailure('INVALID_LOCALE', 'locale must be es or en')
  }

  const iso2 = normalizeIso2(iso2Raw)
  if (iso2.length !== 2) {
    return learnFailure('COUNTRY_NOT_FOUND', 'iso2 is not in catalog')
  }

  const country = findCountryByIso2(iso2)
  if (!country) {
    return learnFailure('COUNTRY_NOT_FOUND', 'iso2 is not in catalog')
  }

  return {
    ok: true,
    data: { iso2, locale, country },
  }
}
