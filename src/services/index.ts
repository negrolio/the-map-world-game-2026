export const serviceShell = {
  id: 'services',
  status: 'ready',
} as const

export { assertValidSession, createGameSession } from './game-session-service'
export { advanceToNextRoundOrFinish, beginPlayingSession, submitRoundGuess } from './game-round-service'
export type { SubmitRoundGuessInput, SubmitRoundGuessSuccess } from './game-round-service'
export { PRODUCT_RULES, getQuestionCountLimits } from './product-rules'
export { buildQuestionPool } from './build-question-pool'
export type { BuildQuestionPoolInput, BuildQuestionPoolResult, QuestionPoolItem } from './build-question-pool'
export { validateConfig } from './validate-config'
export type {
  ConfigValidationError,
  ConfigValidationResult,
  ValidateConfigInput,
} from './validate-config'
export {
  readIso2FromTopologyProperties,
  resolveCatalogIso2OrNull,
  resolveCountryClickFromTopologyProperties,
} from './topology-country-click'
