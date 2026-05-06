import { z } from 'zod'

import { PRODUCT_RULES } from '../../services'
import type { GameConfig } from '../../types'

const regionFilterSchema = z.enum(['world', 'africa', 'americas', 'asia', 'europe', 'oceania'])
const questionModeSchema = z.enum(['country', 'capital'])
const antiCheatModeSchema = z.enum(['normal', 'strict'])

const playerNameSchema = z
  .string()
  .trim()
  .min(1, 'Player names cannot be empty.')

export const setupConfigSchema = z.object({
  players: z
    .array(playerNameSchema)
    .min(PRODUCT_RULES.players.min, `At least ${PRODUCT_RULES.players.min} player is required.`)
    .max(PRODUCT_RULES.players.max, `A maximum of ${PRODUCT_RULES.players.max} players is allowed.`),
  questionMode: questionModeSchema,
  regionFilter: regionFilterSchema,
  antiCheatMode: antiCheatModeSchema,
  questionCount: z.number().int().min(1, 'Question count must be at least 1.'),
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
