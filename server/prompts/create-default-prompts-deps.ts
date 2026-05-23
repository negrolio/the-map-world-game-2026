import { createAiTriviaCache } from './ai-trivia-cache.js'
import { createAiTriviaTracerFromEnv } from './ai-trivia-trace.js'
import { createLlmClientFake } from './llm-client-fake.js'
import { createLlmClientGemini } from './llm-client-gemini.js'
import type {
  AiTriviaCache,
  GenerateAiPromptsDeps,
  LlmClient,
} from './prompts-deps.js'
import { createWikipediaGroundingClient } from './wikipedia-grounding-client.js'

let sharedCache: AiTriviaCache | undefined

export function getDefaultPromptsDeps(): GenerateAiPromptsDeps {
  if (!sharedCache) {
    sharedCache = createAiTriviaCache()
  }
  return {
    llmClient: resolveDefaultLlmClient(),
    groundingClient: createWikipediaGroundingClient(),
    cache: sharedCache,
    now: () => Date.now(),
    random: () => Math.random(),
    tracer: createAiTriviaTracerFromEnv(),
  }
}

function resolveDefaultLlmClient(): LlmClient {
  if (process.env.USE_FAKE_LLM === '1') {
    return createLlmClientFake()
  }
  return createLlmClientGemini()
}

/** Solo tests: reinicia la caché compartida del runtime actual. */
export function resetDefaultPromptsDepsForTests(): void {
  sharedCache = undefined
}
