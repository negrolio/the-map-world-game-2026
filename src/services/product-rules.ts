export const PRODUCT_RULES = {
  players: {
    min: 1,
    max: 6,
  },
  scoring: {
    correctAnswerPoints: 10,
    wrongAnswerPoints: -5,
  },
  hints: {
    enabledInMvpUi: false,
  },
  questions: {
    min: 1,
  },
} as const

export function getQuestionCountLimits(poolSize: number): { min: number; max: number } {
  const safePoolSize = Math.max(0, Math.floor(poolSize))

  if (safePoolSize === 0) {
    return { min: PRODUCT_RULES.questions.min, max: PRODUCT_RULES.questions.min }
  }

  return {
    min: PRODUCT_RULES.questions.min,
    max: Math.max(PRODUCT_RULES.questions.min, safePoolSize),
  }
}
