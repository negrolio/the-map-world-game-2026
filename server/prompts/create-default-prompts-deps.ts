import { createAiTriviaTracerFromEnv } from './ai-trivia-trace.js'
import { createLlmClientFake } from './llm-client-fake.js'
import { createLlmClientGemini } from './llm-client-gemini.js'
import type { GenerateAiPromptsDeps, LlmClient } from './prompts-deps.js'
import { createRiddleRepositoryConvex } from './riddle-repository-convex.js'
import { createRiddleRepositoryWithL1 } from './riddle-repository-l1.js'
import type { RiddleRepository } from './riddle-repository.js'
import { createWikipediaGroundingClient } from './wikipedia-grounding-client.js'

/**
 * Composición de dependencias por defecto del modo AI trivia para el
 * runtime de Vercel Functions. Mantiene un `RiddleRepository` compartido
 * entre invocaciones del mismo proceso para que el decorador L1 sirva hits
 * en caliente (D5, D6 del PRD `riddle-storage-convex`).
 *
 * `CONVEX_URL` se resuelve **lazy**, en la primera request: si falta o está
 * vacío, lanzamos un `Error` claro para diagnóstico local. En runtime de
 * Vercel siempre debería estar provisto vía las env vars del proyecto
 * (Marketplace o configurada a mano).
 */

let sharedRepository: RiddleRepository | undefined

export function getDefaultPromptsDeps(): GenerateAiPromptsDeps {
  if (!sharedRepository) {
    sharedRepository = createDefaultRiddleRepository()
  }
  return {
    llmClient: resolveDefaultLlmClient(),
    groundingClient: createWikipediaGroundingClient(),
    riddleRepository: sharedRepository,
    now: () => Date.now(),
    random: () => Math.random(),
    llmProviderId: resolveDefaultLlmProviderId(),
    tracer: createAiTriviaTracerFromEnv(),
  }
}

function resolveDefaultLlmClient(): LlmClient {
  if (process.env.USE_FAKE_LLM === '1') {
    return createLlmClientFake()
  }
  return createLlmClientGemini()
}

function resolveDefaultLlmProviderId(): string {
  if (process.env.USE_FAKE_LLM === '1') return 'fake'
  return 'gemini'
}

function createDefaultRiddleRepository(): RiddleRepository {
  const convexUrl = process.env.CONVEX_URL?.trim()
  if (!convexUrl) {
    throw new Error(
      'Missing CONVEX_URL: set it in .env.local for `vercel dev` or in the Vercel project (Preview + Production).',
    )
  }
  return createRiddleRepositoryWithL1(createRiddleRepositoryConvex({ convexUrl }))
}

/** Solo tests: reinicia el repositorio compartido del runtime actual. */
export function resetDefaultPromptsDepsForTests(): void {
  sharedRepository = undefined
}
