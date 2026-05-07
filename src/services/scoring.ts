import type { Player } from '../types'
import { PRODUCT_RULES } from './product-rules'

/** Aplica +10 / -5 y contadores según `PRODUCT_RULES.scoring` (única fuente numérica). */
export function applyAnswerToPlayer(player: Player, isCorrect: boolean): Player {
  if (isCorrect) {
    return {
      ...player,
      score: player.score + PRODUCT_RULES.scoring.correctAnswerPoints,
      correctAnswers: player.correctAnswers + 1,
    }
  }

  return {
    ...player,
    score: player.score + PRODUCT_RULES.scoring.wrongAnswerPoints,
    wrongAnswers: player.wrongAnswers + 1,
  }
}

/** Porcentaje de aciertos sobre respuestas registradas (0 si no hubo respuestas). */
export function answerAccuracyPercent(correctAnswers: number, wrongAnswers: number): number {
  const total = correctAnswers + wrongAnswers
  if (total <= 0) {
    return 0
  }

  return Math.round((correctAnswers / total) * 100)
}
