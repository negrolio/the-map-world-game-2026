/** Títulos de artículo opcionales cuando el nombre localizado no coincide con Wikipedia. */
const ISO_WIKIPEDIA_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  GB: 'United_Kingdom',
  US: 'United_States',
  KR: 'South_Korea',
  KP: 'North_Korea',
  CD: 'Democratic_Republic_of_the_Congo',
  CG: 'Republic_of_the_Congo',
  CZ: 'Czech_Republic',
  TR: 'Turkey',
}

export function getIsoWikipediaTitleOverride(iso2: string): string | undefined {
  return ISO_WIKIPEDIA_TITLE_OVERRIDES[iso2]
}
