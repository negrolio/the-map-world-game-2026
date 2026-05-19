import type { LearnProfile } from '../../types/learn-api'

export const LEARN_PROFILE_STORAGE_KEY = 'map-game:learn-last-profile:v2'

export function readLastLearnProfile(): LearnProfile | null {
  try {
    const raw = sessionStorage.getItem(LEARN_PROFILE_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    return isLearnProfile(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeLastLearnProfile(profile: LearnProfile): void {
  try {
    sessionStorage.setItem(LEARN_PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    /* quota / private mode */
  }
}

function isLearnProfile(value: unknown): value is LearnProfile {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as Record<string, unknown>
  const displayName =
    typeof record.displayName === 'string'
      ? record.displayName
      : typeof record.title === 'string'
        ? record.title
        : null

  return (
    typeof record.iso2 === 'string' &&
    (record.locale === 'es' || record.locale === 'en') &&
    (record.contentLocale === 'es' || record.contentLocale === 'en') &&
    displayName !== null &&
    typeof record.summary === 'string' &&
    (record.flagUrl === null || typeof record.flagUrl === 'string') &&
    typeof record.wikipediaUrl === 'string' &&
    record.source === 'wikipedia'
  )
}
