import type { AppLocale } from '../../shared/app-locale.js'
import {
  getAiTriviaTagEntry,
  type AiTriviaTagId,
} from '../../shared/ai-trivia-tags-schema.js'
import {
  RIDDLE_MAX_LENGTH,
  RIDDLE_MIN_LENGTH,
} from './ai-trivia-constants.js'
import type {
  LlmAttemptNumber,
  LlmGenerateInputItem,
  LlmRerollContextEntry,
} from './prompts-deps.js'

const RULE_LABELS: Record<LlmRerollContextEntry['failedRule'], string> = {
  V1_ISO_MISMATCH: 'expected_iso2 no coincidía con el iso2 solicitado',
  V2_FORBIDDEN_TERM:
    'el riddle contenía el nombre del país, gentilicio, capital, ciudad o moneda',
  V3_LENGTH: `la longitud del riddle estaba fuera del rango [${String(RIDDLE_MIN_LENGTH)},${String(RIDDLE_MAX_LENGTH)}]`,
  V4_LANGUAGE: 'el idioma del riddle no coincidía con el locale solicitado',
  V5_ARTICLE_MISSING:
    'claimed_source_title no correspondía a un artículo existente en Wikipedia',
  V6_COUNTRY_NOT_MENTIONED:
    'el artículo declarado no mencionaba al país objetivo',
  V7_SELF_INVALID: 'devolviste valid: false (ambigüedad propia)',
  V8_BAD_DIFFICULTY: 'difficulty no era easy/medium/hard',
  PARSE_ERROR: 'la respuesta no era JSON válido con el shape esperado',
}

export interface BuildPromptInput {
  readonly locale: AppLocale
  readonly attempt: LlmAttemptNumber
  readonly items: readonly LlmGenerateInputItem[]
  readonly rerollContext?: readonly LlmRerollContextEntry[]
}

export interface BuiltPrompt {
  readonly systemInstruction: string
  readonly userInstruction: string
  readonly responseSchema: GeminiResponseSchema
}

/**
 * Schema OpenAPI 3.0 para Gemini `generationConfig.responseSchema`.
 * Fuerza snake_case en la salida del modelo (el parser también acepta camelCase).
 */
export type GeminiResponseSchema = Record<string, unknown>

export function buildPrompt(input: BuildPromptInput): BuiltPrompt {
  const localeLabel = input.locale === 'es' ? 'español' : 'inglés'
  const tagHints = collectTagHints(input.items, input.locale)
  const itemsBlock = renderItemsBlock(input.items, input.locale)
  const rerollBlock = renderRerollBlock(input.rerollContext)

  const systemInstruction = [
    `Eres un generador de adivinanzas (riddles) para un juego de geografía.`,
    `Te paso una LISTA de items, cada uno con (iso2, tag). Para cada item devuelves un objeto.`,
    ``,
    `Reglas estrictas (válidas para CADA item):`,
    `1. La adivinanza se basa en hechos verificables en Wikipedia. Declara el TÍTULO EXACTO del artículo en \`claimed_source_title\`, en el idioma indicado por \`claimed_source_locale\`. No inventes títulos.`,
    `2. \`expected_iso2\` debe coincidir con el \`iso2\` recibido (no respondas otro país).`,
    `3. La respuesta correcta debe ser UN solo país sin ambigüedad con vecinos o países de la misma región cultural.`,
    `4. NO menciones el nombre del país, gentilicios, capital, ciudades famosas, moneda ni topónimos que delaten la respuesta. (El servidor también lo valida.)`,
    `5. Longitud del riddle: ${String(RIDDLE_MIN_LENGTH)}-${String(RIDDLE_MAX_LENGTH)} caracteres.`,
    `6. Idioma del riddle: ${localeLabel} (locale="${input.locale}").`,
    `7. Si no puedes cumplir las reglas con un hecho confiable, devuelve para ese item \`{ "iso2": ..., "tag": ..., "error": "insufficient_grounding" }\`.`,
    `8. Si tu adivinanza admite varios países como respuesta, marca \`valid: false\` (el servidor la descartará).`,
    `9. Devuelves SOLO JSON con la forma \`{ "items": [...] }\` en el MISMO orden que la lista de entrada. Sin texto fuera del JSON.`,
  ].join('\n')

  const userInstruction = [
    `Locale objetivo: ${input.locale}`,
    `Intento: ${String(input.attempt)} de 3`,
    ``,
    `Items:`,
    itemsBlock,
    ``,
    `Pistas temáticas por tag:`,
    tagHints,
    rerollBlock,
  ]
    .filter((line) => line !== '')
    .join('\n')

  return {
    systemInstruction,
    userInstruction,
    responseSchema: buildResponseSchema(),
  }
}

function renderItemsBlock(
  items: readonly LlmGenerateInputItem[],
  locale: AppLocale,
): string {
  return items
    .map((item, index) => `${String(index + 1)}. iso2=${item.iso2}, tag=${item.tag}, locale=${locale}`)
    .join('\n')
}

function collectTagHints(
  items: readonly LlmGenerateInputItem[],
  locale: AppLocale,
): string {
  const uniqueTags: AiTriviaTagId[] = []
  const seen = new Set<AiTriviaTagId>()
  for (const item of items) {
    if (!seen.has(item.tag)) {
      seen.add(item.tag)
      uniqueTags.push(item.tag)
    }
  }
  return uniqueTags
    .map((tag) => {
      const hint = getAiTriviaTagEntry(tag).promptHint[locale]
      return `- ${tag}: ${hint}`
    })
    .join('\n')
}

function renderRerollBlock(
  rerollContext: readonly LlmRerollContextEntry[] | undefined,
): string {
  if (!rerollContext || rerollContext.length === 0) return ''
  const lines = rerollContext.map(
    (entry) => `- iso2=${entry.iso2}, tag=${entry.tag}: rechazado porque ${RULE_LABELS[entry.failedRule]}.`,
  )
  return ['', 'Re-roll: corrige los siguientes items rechazados en el intento anterior:', ...lines].join(
    '\n',
  )
}

function buildResponseSchema(): GeminiResponseSchema {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            iso2: { type: 'string' },
            tag: { type: 'string' },
            riddle: { type: 'string' },
            expected_iso2: { type: 'string' },
            justification: { type: 'string' },
            claimed_source_title: { type: 'string' },
            claimed_source_locale: { type: 'string', enum: ['es', 'en'] },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            valid: { type: 'boolean' },
            error: { type: 'string' },
          },
          required: ['iso2', 'tag'],
        },
      },
    },
    required: ['items'],
  }
}
