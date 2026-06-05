import data from './country-tones.json'

const TONES = data.tones as Readonly<Record<string, number>>

export const COUNTRY_TONE_COUNT: number = data.toneCount

/** Tono asignado al país; 0 (base) si no está en la tabla. */
export function getToneIndexForIso2(iso2: string | undefined): number {
  if (!iso2) return 0
  return TONES[iso2] ?? 0
}
