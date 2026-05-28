import { countriesCatalog, type CountryRecord } from '../../data/countries'
import { getLocalizedCountryName } from '../../data/country-localization'
import type { AppLocale } from '../../i18n/app-locale'
import type { IsoCountryCode } from '../../types'

const countryByIso2: ReadonlyMap<string, CountryRecord> = new Map(
  countriesCatalog.map((country) => [country.iso2, country]),
)

/**
 * Resuelve el nombre localizado de un país a partir de su ISO2. Delega en
 * `getLocalizedCountryName` cuando el ISO2 existe en `countriesCatalog`.
 *
 * Si el ISO2 no está catalogado, devuelve un fallback **defensivo** entre
 * llaves (p. ej. `{AR}`) para no romper la UI. En flujo normal este fallback
 * no debería dispararse: todos los ISO2 jugables (objetivo + selección del
 * jugador en el mapa) provienen del mismo `countriesCatalog`. La rama queda
 * cubierta por test para alinearse con el RF-F29 del PRD UX feedback modo AI.
 */
export function resolveCountryNameByIso2(iso2: IsoCountryCode, locale: AppLocale): string {
  const upperIso2 = iso2.toUpperCase()
  const country = countryByIso2.get(upperIso2)
  if (!country) {
    return `{${upperIso2}}`
  }
  return getLocalizedCountryName(country, locale)
}
