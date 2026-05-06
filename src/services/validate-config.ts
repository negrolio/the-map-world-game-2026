import type { GameConfig } from '../types'
import { PRODUCT_RULES, getQuestionCountLimits } from './product-rules'

export interface ConfigValidationError {
  readonly field: 'players' | 'questionCount' | 'pool'
  readonly message: string
}

export interface ConfigValidationResult {
  readonly isValid: boolean
  readonly errors: readonly ConfigValidationError[]
  readonly questionLimits: {
    readonly min: number
    readonly max: number
  }
}

export interface ValidateConfigInput {
  readonly config: GameConfig
  readonly poolSize: number
}

/**
 * Fuente unica de verdad para validacion de configuracion entre UI y dominio.
 */
export function validateConfig(input: ValidateConfigInput): ConfigValidationResult {
  const { config, poolSize } = input
  const errors: ConfigValidationError[] = []
  const questionLimits = getQuestionCountLimits(poolSize)
  const trimmedPlayerNames = config.players.map((player) => player.trim())
  const hasEmptyPlayerName = trimmedPlayerNames.some((name) => name.length === 0)

  if (config.players.length < PRODUCT_RULES.players.min) {
    errors.push({
      field: 'players',
      message: `At least ${PRODUCT_RULES.players.min} player is required.`,
    })
  }

  if (config.players.length > PRODUCT_RULES.players.max) {
    errors.push({
      field: 'players',
      message: `A maximum of ${PRODUCT_RULES.players.max} players is allowed.`,
    })
  }

  if (hasEmptyPlayerName) {
    errors.push({
      field: 'players',
      message: 'Player names cannot be empty.',
    })
  }

  if (poolSize <= 0) {
    errors.push({
      field: 'pool',
      message: 'No questions are available for the selected filters.',
    })
  }

  if (config.questionCount < questionLimits.min || config.questionCount > questionLimits.max) {
    errors.push({
      field: 'questionCount',
      message: `Question count must be between ${questionLimits.min} and ${questionLimits.max}.`,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    questionLimits,
  }
}
