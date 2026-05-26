import type { AiPromptSource } from '../../shared/ai-trivia-api'
import type { CountryRecord } from '../data'
import { getLocalizedCapital, getLocalizedCountryName } from '../data/country-localization'
import type { AppLocale } from '../i18n/app-locale'
import type { IsoCountryCode, QuestionMode, RegionFilter } from '../types'

export interface QuestionPoolItem {
  readonly id: string
  readonly answerCountryCode: IsoCountryCode
  readonly prompt: string
  readonly mode: QuestionMode
  /** Metadatos de origen para modo 'ai' (riddle generado por LLM). */
  readonly aiSource?: AiPromptSource
  /**
   * Identificador opaco del riddle persistido en Convex, propagado desde
   * `AiPromptItem.riddleId`. Solo presente para items de modo `'ai'`. El
   * frontend lo registra en `localStorage` (`ai-trivia-seen-ids`) para
   * que un próximo fetch lo envíe en `excludedIds` y evitar repetidos.
   */
  readonly aiRiddleId?: string
}

export interface BuildQuestionPoolInput {
  readonly countries: readonly CountryRecord[]
  readonly regionFilter: RegionFilter
  readonly questionMode: QuestionMode
  readonly locale: AppLocale
  readonly seed?: number
  readonly requestedQuestionCount?: number
}

export interface BuildQuestionPoolResult {
  readonly allQuestions: readonly QuestionPoolItem[]
  readonly selectedQuestions: readonly QuestionPoolItem[]
  readonly maxQuestionCount: number
}

function mulberry32(seed: number): () => number {
  let currentSeed = seed >>> 0

  return () => {
    currentSeed += 0x6d2b79f5
    let t = currentSeed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleDeterministic<T>(items: readonly T[], seed: number): readonly T[] {
  const random = mulberry32(seed)
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = current
  }

  return result
}

function buildPrompt(country: CountryRecord, mode: QuestionMode, locale: AppLocale): string {
  if (mode === 'capital') {
    return getLocalizedCapital(country, locale)
  }

  return getLocalizedCountryName(country, locale)
}

export function buildQuestionPool(input: BuildQuestionPoolInput): BuildQuestionPoolResult {
  const filteredCountries =
    input.regionFilter === 'world'
      ? input.countries
      : input.countries.filter((country) => country.continent === input.regionFilter)

  const baseQuestions: readonly QuestionPoolItem[] = filteredCountries.map((country) => ({
    id: `${input.questionMode}-${country.iso2}`,
    answerCountryCode: country.iso2,
    prompt: buildPrompt(country, input.questionMode, input.locale),
    mode: input.questionMode,
  }))

  const shuffledQuestions =
    typeof input.seed === 'number'
      ? shuffleDeterministic(baseQuestions, input.seed)
      : shuffleDeterministic(baseQuestions, Date.now())

  const maxQuestionCount = baseQuestions.length
  const safeRequestedCount = Math.max(0, Math.floor(input.requestedQuestionCount ?? maxQuestionCount))
  const boundedQuestionCount = Math.min(safeRequestedCount, maxQuestionCount)

  return {
    allQuestions: shuffledQuestions,
    selectedQuestions: shuffledQuestions.slice(0, boundedQuestionCount),
    maxQuestionCount,
  }
}
