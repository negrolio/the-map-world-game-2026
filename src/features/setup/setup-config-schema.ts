import { z } from 'zod'

import {
  AI_TRIVIA_TAG_IDS,
  type AiTriviaTagId,
} from '../../../shared/ai-trivia-tags-schema'
import { PRODUCT_RULES } from '../../services'
import type { GameConfig } from '../../types'

const regionFilterSchema = z.enum(['world', 'africa', 'americas', 'asia', 'europe', 'oceania'])
const questionModeSchema = z.enum(['country', 'capital', 'ai'])
const antiCheatModeSchema = z.enum(['normal', 'strict'])
const tagSchema: z.ZodType<AiTriviaTagId> = z.enum(
  AI_TRIVIA_TAG_IDS as readonly [AiTriviaTagId, ...AiTriviaTagId[]],
)

const playerNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'schema.playerNameEmpty' })

export const setupConfigSchema = z
  .object({
    players: z
      .array(playerNameSchema)
      .min(PRODUCT_RULES.players.min, {
        message: 'schema.playersMin',
      })
      .max(PRODUCT_RULES.players.max, {
        message: 'schema.playersMax',
      }),
    questionMode: questionModeSchema,
    regionFilter: regionFilterSchema,
    antiCheatMode: antiCheatModeSchema,
    questionCount: z.number().int().min(1, { message: 'schema.questionCountMin' }),
    tags: z.array(tagSchema).optional(),
  })
  .refine(
    (value) => value.questionMode !== 'ai' || value.antiCheatMode === 'strict',
    { message: 'schema.aiRequiresStrict', path: ['antiCheatMode'] },
  )
  .superRefine((value, context) => {
    if (value.questionMode !== 'ai') {
      return
    }

    if (value.players.length > PRODUCT_RULES.ai.maxPlayers) {
      context.addIssue({
        code: 'custom',
        message: 'schema.aiPlayersMax',
        path: ['players'],
      })
    }

    if (value.questionCount !== PRODUCT_RULES.ai.fixedQuestionCount) {
      context.addIssue({
        code: 'custom',
        message: 'schema.aiFixedQuestionCount',
        path: ['questionCount'],
      })
    }
  })

export interface SetupSchemaValidationResult {
  readonly isValid: boolean
  readonly config?: GameConfig
  readonly errors: readonly string[]
}

export function validateSetupConfigSchema(input: GameConfig): SetupSchemaValidationResult {
  const result = setupConfigSchema.safeParse(input)

  if (!result.success) {
    return {
      isValid: false,
      errors: result.error.issues.map((issue) => issue.message),
    }
  }

  return {
    isValid: true,
    config: result.data,
    errors: [],
  }
}
