import type { GetCountryLearnProfileDeps } from '../../server/learn/learn-deps'
import { getCountryLearnProfile } from '../../server/learn/get-country-learn-profile'
import type { LearnResult } from '../../shared/learn-types'
import type { LearnProfile } from '../../shared/learn-types'

export async function handleLearnGet(
  iso2: string,
  locale: string,
  deps: GetCountryLearnProfileDeps,
): Promise<LearnResult<LearnProfile>> {
  return getCountryLearnProfile(iso2, locale, deps)
}
