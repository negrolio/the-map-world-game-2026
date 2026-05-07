export const serviceShell = {
  id: 'services',
  status: 'ready',
} as const

export { assertValidSession, createGameSession } from './game-session-service'
export { advanceToNextRoundOrFinish, beginPlayingSession, submitRoundGuess } from './game-round-service'
export { buildGameResult } from './game-result'
export { buildLeaderboard, comparePlayersForLeaderboard } from './ranking'
export { answerAccuracyPercent, applyAnswerToPlayer } from './scoring'
export {
  getActivePlayerForRound,
  getActivePlayerIdForRound,
  sortPlayersByTurnOrder,
} from './turn-engine'
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
