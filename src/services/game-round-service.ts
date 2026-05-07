import type { QuestionPoolItem } from './build-question-pool'
import { buildGameResult } from './game-result'
import { applyAnswerToPlayer } from './scoring'
import { getActivePlayerIdForRound } from './turn-engine'
import type { ApiResponse, GameSession, Guess, IsoCountryCode, Round } from '../types'
import { DomainError } from '../types'

export function beginPlayingSession(
  session: GameSession,
  selectedQuestions: readonly QuestionPoolItem[],
): GameSession {
  if (selectedQuestions.length === 0) {
    throw new DomainError('INVALID_CONFIG', 'Cannot start playing without at least one question.')
  }

  const rounds: readonly Round[] = selectedQuestions.map((item, index) => ({
    id: `round-${index + 1}-${item.id}`,
    roundNumber: index + 1,
    targetCountryCode: item.answerCountryCode,
    prompt: item.prompt,
  }))

  return {
    ...session,
    status: 'playing',
    rounds,
    activeRoundIndex: 0,
  }
}

export interface SubmitRoundGuessInput {
  readonly session: GameSession
  readonly selectedCountryCode: IsoCountryCode | null
  readonly playerId: string
  readonly answeredAtISO: string
}

export interface SubmitRoundGuessSuccess {
  readonly session: GameSession
  readonly guess: Guess
}

export function submitRoundGuess(
  input: SubmitRoundGuessInput,
): ApiResponse<SubmitRoundGuessSuccess> {
  const { session, selectedCountryCode, playerId, answeredAtISO } = input

  if (session.status !== 'playing') {
    return {
      success: false,
      error: {
        code: 'ROUND_NOT_ACTIVE',
        message:
          session.status === 'finished'
            ? 'La partida ya terminó; no se pueden registrar más respuestas.'
            : 'No hay una ronda activa para registrar la respuesta.',
      },
    }
  }

  if (selectedCountryCode === null) {
    return {
      success: false,
      error: {
        code: 'INVALID_GUESS',
        message: 'El mapa no pudo resolver un ISO2 para esta selección.',
      },
    }
  }

  const roundIndex = session.activeRoundIndex
  if (roundIndex < 0 || roundIndex >= session.rounds.length) {
    return {
      success: false,
      error: {
        code: 'ROUND_NOT_ACTIVE',
        message: 'Índice de ronda fuera de rango.',
      },
    }
  }

  const currentRound = session.rounds[roundIndex]
  if (currentRound.guess) {
    return {
      success: false,
      error: {
        code: 'INVALID_GUESS',
        message: 'Esta ronda ya tiene una respuesta registrada.',
      },
    }
  }

  const expectedPlayerId = getActivePlayerIdForRound(session)
  if (!expectedPlayerId) {
    return {
      success: false,
      error: {
        code: 'ROUND_NOT_ACTIVE',
        message: 'No se pudo determinar el jugador en turno.',
      },
    }
  }

  if (playerId !== expectedPlayerId) {
    return {
      success: false,
      error: {
        code: 'INVALID_GUESS',
        message: 'No es el turno de este jugador.',
      },
    }
  }

  const isCorrect = selectedCountryCode === currentRound.targetCountryCode

  const guess: Guess = {
    playerId,
    selectedCountryCode,
    isCorrect,
    answeredAtISO,
  }

  const updatedRound: Round = { ...currentRound, guess }

  const updatedRounds = session.rounds.map((round, index) =>
    index === roundIndex ? updatedRound : round,
  )

  const playerIndex = session.players.findIndex((player) => player.id === playerId)
  if (playerIndex === -1) {
    return {
      success: false,
      error: {
        code: 'INVALID_GUESS',
        message: 'El jugador no pertenece a esta sesión.',
      },
    }
  }

  const updatedPlayers = session.players.map((player, index) =>
    index === playerIndex ? applyAnswerToPlayer(player, isCorrect) : player,
  )

  return {
    success: true,
    data: {
      session: {
        ...session,
        rounds: updatedRounds,
        players: updatedPlayers,
      },
      guess,
    },
  }
}

/**
 * Tras una ronda respondida: pasa a la siguiente o marca la sesión como `finished` si era la última.
 */
export function advanceToNextRoundOrFinish(session: GameSession): ApiResponse<GameSession> {
  if (session.status !== 'playing') {
    return {
      success: false,
      error: {
        code: 'ROUND_NOT_ACTIVE',
        message: 'Solo se puede avanzar mientras la partida está en curso.',
      },
    }
  }

  const roundIndex = session.activeRoundIndex
  if (roundIndex < 0 || roundIndex >= session.rounds.length) {
    return {
      success: false,
      error: {
        code: 'ROUND_NOT_ACTIVE',
        message: 'Índice de ronda fuera de rango.',
      },
    }
  }

  const currentRound = session.rounds[roundIndex]
  if (!currentRound.guess) {
    return {
      success: false,
      error: {
        code: 'INVALID_GUESS',
        message: 'Respondé antes de avanzar de ronda.',
      },
    }
  }

  if (roundIndex < session.rounds.length - 1) {
    return {
      success: true,
      data: {
        ...session,
        activeRoundIndex: roundIndex + 1,
      },
    }
  }

  return {
    success: true,
    data: {
      ...session,
      status: 'finished',
      result: buildGameResult(session.players, session.rounds.length),
    },
  }
}
