import type { Player } from '../types'

/**
 * Comparador para tabla de posiciones: puntos ↓, aciertos ↓, errores ↑, turnOrder ↑, nombre (es).
 */
export function comparePlayersForLeaderboard(playerA: Player, playerB: Player): number {
  if (playerB.score !== playerA.score) {
    return playerB.score - playerA.score
  }

  if (playerB.correctAnswers !== playerA.correctAnswers) {
    return playerB.correctAnswers - playerA.correctAnswers
  }

  if (playerA.wrongAnswers !== playerB.wrongAnswers) {
    return playerA.wrongAnswers - playerB.wrongAnswers
  }

  if (playerA.turnOrder !== playerB.turnOrder) {
    return playerA.turnOrder - playerB.turnOrder
  }

  return playerA.name.localeCompare(playerB.name, 'es', { sensitivity: 'base' })
}

export function buildLeaderboard(players: readonly Player[]): readonly Player[] {
  return [...players].sort(comparePlayersForLeaderboard)
}
