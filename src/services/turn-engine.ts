import type { GameSession, Player } from '../types'

export function sortPlayersByTurnOrder(players: readonly Player[]): readonly Player[] {
  return [...players].sort((playerA, playerB) => playerA.turnOrder - playerB.turnOrder)
}

/**
 * Jugador que debe responder la ronda actual (`activeRoundIndex`), orden circular según `turnOrder` (1–6).
 */
export function getActivePlayerIdForRound(session: GameSession): string | undefined {
  if (session.players.length === 0 || session.rounds.length === 0) {
    return undefined
  }

  if (session.activeRoundIndex < 0 || session.activeRoundIndex >= session.rounds.length) {
    return undefined
  }

  const ordered = sortPlayersByTurnOrder(session.players)
  const slot = session.activeRoundIndex % ordered.length
  return ordered[slot]?.id
}

export function getActivePlayerForRound(session: GameSession): Player | undefined {
  const activeId = getActivePlayerIdForRound(session)
  return session.players.find((player) => player.id === activeId)
}
