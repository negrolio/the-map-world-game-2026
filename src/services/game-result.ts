import type { GameResult, Player } from '../types'
import { buildLeaderboard } from './ranking'

export function buildGameResult(players: readonly Player[], totalRounds: number): GameResult {
  const leaderboard = buildLeaderboard(players)

  return {
    winnerPlayerId: leaderboard[0]?.id,
    leaderboard,
    totalRounds,
  }
}
