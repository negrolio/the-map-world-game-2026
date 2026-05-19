import type { AppLocale } from './app-locale.js'

export interface WikipediaSitelinkEntry {
  readonly wikidataId: string
  readonly titles: Partial<Record<AppLocale, string>>
}

export type WikipediaSitelinksMap = Readonly<Record<string, WikipediaSitelinkEntry>>
