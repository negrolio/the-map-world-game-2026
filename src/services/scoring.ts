import type { Player } from '../types'
import { PRODUCT_RULES } from './product-rules'

/**
 * Aplica el resultado de una respuesta a un jugador.
 *
 * Por defecto suma `+correctAnswerPoints` o `+wrongAnswerPoints` desde
 * `PRODUCT_RULES.scoring` (modo país/capital). Para el modo AI trivia se
 * pasa `scoreDelta` explícito (1 / 0.5 / 0.25 según el intento) y se
 * agrega tal cual al score.
 *
 * Mantener `scoreDelta` opcional permite no regresar los modos legacy.
 */
export function applyAnswerToPlayer(
  player: Player,
  isCorrect: boolean,
  scoreDelta?: number,
): Player {
  const delta =
    scoreDelta !== undefined
      ? scoreDelta
      : isCorrect
        ? PRODUCT_RULES.scoring.correctAnswerPoints
        : PRODUCT_RULES.scoring.wrongAnswerPoints

  if (isCorrect) {
    return {
      ...player,
      score: player.score + delta,
      correctAnswers: player.correctAnswers + 1,
    }
  }

  return {
    ...player,
    score: player.score + delta,
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
