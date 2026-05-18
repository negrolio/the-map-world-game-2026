import type { GetCountryLearnProfileDeps } from '../../server/learn/learn-deps.js'
import { getCountryLearnProfile } from '../../server/learn/get-country-learn-profile.js'
import type { LearnResult } from '../../shared/learn-types.js'
import type { LearnProfile } from '../../shared/learn-types.js'

export async function handleLearnGet(
  iso2: string,
  locale: string,
  deps: GetCountryLearnProfileDeps,
): Promise<LearnResult<LearnProfile>> {
  return getCountryLearnProfile(iso2, locale, deps)
}
