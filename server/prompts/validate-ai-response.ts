import type { AppLocale } from '../../shared/app-locale.js'
import type { AiPromptDifficulty } from '../../shared/ai-trivia-api.js'
import {
  RIDDLE_MAX_LENGTH,
  RIDDLE_MIN_LENGTH,
} from './ai-trivia-constants.js'
import {
  findFirstForbiddenTerm,
  getForbiddenTermsForIso2,
} from './forbidden-terms.js'
import type {
  LlmGenerateOutputItem,
  WikipediaGroundingClient,
} from './prompts-deps.js'

export type ValidationRuleCode =
  | 'V1_ISO_MISMATCH'
  | 'V2_FORBIDDEN_TERM'
  | 'V3_LENGTH'
  | 'V4_LANGUAGE'
  | 'V5_ARTICLE_MISSING'
  | 'V6_COUNTRY_NOT_MENTIONED'
  | 'V7_SELF_INVALID'
  | 'V8_BAD_DIFFICULTY'

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly rule: ValidationRuleCode }
  | { readonly ok: false; readonly rule: 'WIKIPEDIA_UNAVAILABLE' }

export interface ValidateItemInput {
  readonly requestIso2: string
  readonly locale: AppLocale
  readonly item: Extract<LlmGenerateOutputItem, { kind: 'ok' }>
}

export interface ValidateItemDeps {
  readonly groundingClient: WikipediaGroundingClient
  /**
   * Caché compartida por todo el batch (incluyendo re-rolls) para no re-pegarle
   * a Wikipedia por el mismo (title, locale, iso2). Pasa una Map vacía.
   */
  readonly groundingMemo: Map<string, Awaited<ReturnType<WikipediaGroundingClient['checkGrounding']>>>
}

/**
 * Corre V1..V8 en orden. V5/V6 consultan al grounding client real (con caché).
 * Devuelve `{ ok: true }` o `{ ok: false, rule }` apuntando a la PRIMERA regla
 * incumplida.
 */
export async function validateAiResponseItem(
  input: ValidateItemInput,
  deps: ValidateItemDeps,
): Promise<ValidationResult> {
  const { item, requestIso2, locale } = input

  const v1 = validateV1IsoEcho(item, requestIso2)
  if (!v1.ok) return v1

  const v8 = validateV8Difficulty(item.difficulty)
  if (!v8.ok) return v8

  const v7 = validateV7Self(item.valid)
  if (!v7.ok) return v7

  const v3 = validateV3Length(item.riddle)
  if (!v3.ok) return v3

  const v4 = validateV4Language(item.riddle, locale)
  if (!v4.ok) return v4

  const v2 = validateV2ForbiddenTerm(item.riddle, requestIso2, locale)
  if (!v2.ok) return v2

  const grounding = await runGrounding(
    requestIso2,
    item.claimedSourceTitle,
    item.claimedSourceLocale,
    deps,
  )
  if (!grounding.ok) return grounding

  return { ok: true }
}

function validateV1IsoEcho(
  item: Extract<LlmGenerateOutputItem, { kind: 'ok' }>,
  requestIso2: string,
): ValidationResult {
  const expected = item.expectedIso2.toUpperCase().trim()
  const actual = requestIso2.toUpperCase().trim()
  if (expected !== actual) {
    return { ok: false, rule: 'V1_ISO_MISMATCH' }
  }
  return { ok: true }
}

function validateV2ForbiddenTerm(
  riddle: string,
  iso2: string,
  locale: AppLocale,
): ValidationResult {
  const terms = getForbiddenTermsForIso2(iso2, locale)
  if (!terms) {
    return { ok: true }
  }
  const hit = findFirstForbiddenTerm(riddle, terms)
  if (hit) {
    return { ok: false, rule: 'V2_FORBIDDEN_TERM' }
  }
  return { ok: true }
}

function validateV3Length(riddle: string): ValidationResult {
  const length = riddle.trim().length
  if (length < RIDDLE_MIN_LENGTH || length > RIDDLE_MAX_LENGTH) {
    return { ok: false, rule: 'V3_LENGTH' }
  }
  return { ok: true }
}

const SPANISH_TOKENS = [
  ' que ',
  ' de ',
  ' la ',
  ' el ',
  ' un ',
  ' una ',
  ' los ',
  ' las ',
  ' es ',
  ' su ',
  ' en ',
  ' del ',
  ' por ',
  ' con ',
  ' este ',
  ' esta ',
  ' qué ',
]

const ENGLISH_TOKENS = [
  ' the ',
  ' is ',
  ' of ',
  ' and ',
  ' a ',
  ' an ',
  ' in ',
  ' to ',
  ' that ',
  ' which ',
  ' its ',
  ' on ',
  ' by ',
  ' with ',
]

function validateV4Language(riddle: string, locale: AppLocale): ValidationResult {
  const padded = ` ${riddle.toLowerCase()} `
  const tokens = locale === 'es' ? SPANISH_TOKENS : ENGLISH_TOKENS
  let hits = 0
  for (const token of tokens) {
    if (padded.includes(token)) hits += 1
  }
  if (hits === 0) {
    return { ok: false, rule: 'V4_LANGUAGE' }
  }
  if (locale === 'es') {
    if (/[áéíóúñ¿¡]/.test(riddle)) {
      return { ok: true }
    }
    if (hits >= 2) return { ok: true }
    return { ok: false, rule: 'V4_LANGUAGE' }
  }
  if (/[áéíóúñ¿¡]/.test(riddle)) {
    return { ok: false, rule: 'V4_LANGUAGE' }
  }
  if (hits >= 2) return { ok: true }
  return { ok: false, rule: 'V4_LANGUAGE' }
}

function validateV7Self(valid: boolean): ValidationResult {
  if (valid === false) {
    return { ok: false, rule: 'V7_SELF_INVALID' }
  }
  return { ok: true }
}

const VALID_DIFFICULTIES: ReadonlySet<AiPromptDifficulty> = new Set<AiPromptDifficulty>([
  'easy',
  'medium',
  'hard',
])

function validateV8Difficulty(difficulty: string): ValidationResult {
  if (!VALID_DIFFICULTIES.has(difficulty as AiPromptDifficulty)) {
    return { ok: false, rule: 'V8_BAD_DIFFICULTY' }
  }
  return { ok: true }
}

async function runGrounding(
  iso2: string,
  title: string,
  locale: AppLocale,
  deps: ValidateItemDeps,
): Promise<ValidationResult> {
  const key = `${title}::${locale}::${iso2.toUpperCase()}`
  const memoed = deps.groundingMemo.get(key)
  const result =
    memoed ?? (await deps.groundingClient.checkGrounding({
      iso2,
      claimedTitle: title,
      claimedLocale: locale,
    }))
  if (!memoed) {
    deps.groundingMemo.set(key, result)
  }
  if (!result.ok) {
    return { ok: false, rule: 'WIKIPEDIA_UNAVAILABLE' }
  }
  if (!result.exists) {
    return { ok: false, rule: 'V5_ARTICLE_MISSING' }
  }
  if (!result.mentionsCountry) {
    return { ok: false, rule: 'V6_COUNTRY_NOT_MENTIONED' }
  }
  return { ok: true }
}
