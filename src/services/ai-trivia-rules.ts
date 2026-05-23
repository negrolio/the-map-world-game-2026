/**
 * Reglas del cliente para el modo AI trivia. Mantiene los números aislados
 * para que cambios futuros (e.g. `MAX_AI_ATTEMPTS = 5`) impliquen tocar
 * solo este archivo y sus tests.
 */

/** Intentos máximos por ronda en modo AI (PRD RF-D04). */
export const MAX_AI_ATTEMPTS = 3

/**
 * Cantidad mínima de items válidos que se esperan antes de habilitar el
 * inicio de la partida. Si el endpoint v1 devuelve todo junto, equivale
 * a "al menos N items en la respuesta". Si en el futuro se hace streaming,
 * esto pasa a ser un threshold de progreso (PRD RF-F23).
 */
export const PRELOAD_THRESHOLD = 3

export type AiAttemptNumber = 1 | 2 | 3
export type AiScoreDelta = 1 | 0.5 | 0.25

/**
 * Score escalonado del primer acierto en modo AI (PRD RF-D04).
 *
 * - 1.º acierto: +1
 * - 2.º acierto: +0.5
 * - 3.º acierto: +0.25
 *
 * Si se agotan los 3 sin acierto, el caller usa `0` directamente.
 */
export function getAiScoreForAttempt(attemptNumber: AiAttemptNumber): AiScoreDelta {
  if (attemptNumber === 1) return 1
  if (attemptNumber === 2) return 0.5
  return 0.25
}

export function isAiAttemptNumber(value: number): value is AiAttemptNumber {
  return value === 1 || value === 2 || value === 3
}
