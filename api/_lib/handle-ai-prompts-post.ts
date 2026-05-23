import { generateAiPrompts } from '../../server/prompts/generate-ai-prompts.js'
import type { GenerateAiPromptsDeps } from '../../server/prompts/prompts-deps.js'
import type { AiPromptsResult } from '../../shared/ai-trivia-api.js'

export async function handleAiPromptsPost(
  body: unknown,
  deps: GenerateAiPromptsDeps,
): Promise<AiPromptsResult> {
  return generateAiPrompts(body, deps)
}
