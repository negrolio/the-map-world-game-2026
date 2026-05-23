import type {
  LlmClient,
  LlmFailureCode,
  LlmGenerateInput,
  LlmGenerateOutput,
  LlmGenerateOutputItem,
  LlmGenerateResult,
} from './prompts-deps.js'

/**
 * `LlmClient` falso para tests y para `vercel dev` cuando no hay
 * `GEMINI_API_KEY`. Acepta:
 * - `respond: (input) => LlmGenerateOutput` — devuelve datos por item.
 * - `respondFailure` — fuerza un fallo controlado para probar el error path.
 *
 * Si solo se pasa `respond`, la fake llamará a esa función con `input` y
 * devolverá `{ ok: true, data: respond(input) }`.
 */
export interface CreateLlmClientFakeOptions {
  readonly respond?: (input: LlmGenerateInput) => LlmGenerateOutput
  readonly respondFailure?: LlmFailureCode
}

export function createLlmClientFake(
  options: CreateLlmClientFakeOptions = {},
): LlmClient {
  return {
    generateRiddles: async (input: LlmGenerateInput): Promise<LlmGenerateResult> => {
      if (options.respondFailure) {
        return { ok: false, code: options.respondFailure }
      }
      const responder = options.respond ?? defaultEcho
      return { ok: true, data: responder(input) }
    },
  }
}

/**
 * Responder por defecto: produce un item "OK" sintético por cada entrada,
 * sin riddle real (no debe usarse en producción).
 */
function defaultEcho(input: LlmGenerateInput): LlmGenerateOutput {
  const items: LlmGenerateOutputItem[] = input.items.map((item) => ({
    kind: 'ok',
    iso2: item.iso2,
    tag: item.tag,
    riddle: `Riddle stub for ${item.iso2} (${item.tag}) en ${input.locale}.`,
    expectedIso2: item.iso2,
    justification: 'stub',
    claimedSourceTitle: 'Stub article',
    claimedSourceLocale: input.locale,
    difficulty: 'medium',
    valid: true,
  }))
  return { items }
}
