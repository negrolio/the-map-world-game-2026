import { z } from 'zod'

import { PRODUCT_RULES } from '../../services'
import type { GameConfig } from '../../types'

const regionFilterSchema = z.enum(['world', 'africa', 'americas', 'asia', 'europe', 'oceania'])
const questionModeSchema = z.enum(['country', 'capital'])
const antiCheatModeSchema = z.enum(['normal', 'strict'])

const playerNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'schema.playerNameEmpty' })

export const setupConfigSchema = z.object({
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
