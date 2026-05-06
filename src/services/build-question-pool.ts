import type { CountryRecord } from '../data'
import type { IsoCountryCode, QuestionMode, RegionFilter } from '../types'

export interface QuestionPoolItem {
  readonly id: string
  readonly answerCountryCode: IsoCountryCode
  readonly prompt: string
  readonly mode: QuestionMode
}

export interface BuildQuestionPoolInput {
  readonly countries: readonly CountryRecord[]
  readonly regionFilter: RegionFilter
  readonly questionMode: QuestionMode
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

function buildPrompt(country: CountryRecord, mode: QuestionMode): string {
  if (mode === 'capital') {
    return country.capital
  }

  return country.name
}

export function buildQuestionPool(input: BuildQuestionPoolInput): BuildQuestionPoolResult {
  const filteredCountries =
    input.regionFilter === 'world'
      ? input.countries
      : input.countries.filter((country) => country.continent === input.regionFilter)

  const baseQuestions: readonly QuestionPoolItem[] = filteredCountries.map((country) => ({
    id: `${input.questionMode}-${country.iso2}`,
    answerCountryCode: country.iso2,
    prompt: buildPrompt(country, input.questionMode),
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
