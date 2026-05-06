import { datasetVersion } from '../data'
import { DomainError, type ApiResponse, type GameConfig, type GameSession, type Player } from '../types'
import { PRODUCT_RULES } from './product-rules'

function buildPlayers(playerNames: readonly string[]): readonly Player[] {
  return playerNames.map((name, index) => ({
    id: `player-${index + 1}`,
    name,
    turnOrder: index,
    score: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
  }))
}

export function createGameSession(config: GameConfig): ApiResponse<GameSession> {
  if (
    config.players.length < PRODUCT_RULES.players.min ||
    config.players.length > PRODUCT_RULES.players.max
  ) {
    return {
      success: false,
      error: {
        code: 'INVALID_CONFIG',
        message: `Players must be between ${PRODUCT_RULES.players.min} and ${PRODUCT_RULES.players.max}.`,
      },
    }
  }

  const players = buildPlayers(config.players)

  const session: GameSession = {
    id: `session-${Date.now()}`,
    status: 'setup',
    config,
    players,
    rounds: [],
    activeRoundIndex: 0,
    incidentCount: 0,
    datasetVersion,
  }

  return {
    success: true,
    data: session,
  }
}

export function assertValidSession(session: GameSession | undefined): GameSession {
  if (!session) {
    throw new DomainError('SESSION_NOT_FOUND', 'No active game session was found.')
  }

  return session
}
