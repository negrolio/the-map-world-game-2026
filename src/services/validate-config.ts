import type { GameConfig } from '../types'
import { PRODUCT_RULES, getQuestionCountLimits } from './product-rules'

export interface ConfigValidationError {
  readonly field: 'players' | 'questionCount' | 'pool' | 'antiCheat'
  /** Clave i18n (`validation.config.*`) */
  readonly messageKey: string
  readonly messageValues?: Readonly<Record<string, string | number>>
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
      messageKey: 'validation.config.playersMin',
      messageValues: { min: PRODUCT_RULES.players.min },
    })
  }

  if (config.players.length > PRODUCT_RULES.players.max) {
    errors.push({
      field: 'players',
      messageKey: 'validation.config.playersMax',
      messageValues: { max: PRODUCT_RULES.players.max },
    })
  }

  if (hasEmptyPlayerName) {
    errors.push({
      field: 'players',
      messageKey: 'validation.config.playerNamesEmpty',
    })
  }

  if (poolSize <= 0) {
    errors.push({
      field: 'pool',
      messageKey: 'validation.config.poolEmpty',
    })
  }

  if (config.questionCount < questionLimits.min || config.questionCount > questionLimits.max) {
    errors.push({
      field: 'questionCount',
      messageKey: 'validation.config.questionCountRange',
      messageValues: { min: questionLimits.min, max: questionLimits.max },
    })
  }

  if (config.questionMode === 'ai' && config.antiCheatMode !== 'strict') {
    errors.push({
      field: 'antiCheat',
      messageKey: 'validation.config.aiRequiresStrict',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    questionLimits,
  }
}
