import {
  MAX_AI_ATTEMPTS,
  getAiScoreForAttempt,
  isAiAttemptNumber,
} from './ai-trivia-rules'
import type { QuestionPoolItem } from './build-question-pool'
import { buildGameResult } from './game-result'
import { applyAnswerToPlayer } from './scoring'
import { getActivePlayerIdForRound } from './turn-engine'
import type {
  AiAttempt,
  ApiResponse,
  GameSession,
  Guess,
  IsoCountryCode,
  Round,
} from '../types'
import { DomainError } from '../types'

export function beginPlayingSession(
  session: GameSession,
  selectedQuestions: readonly QuestionPoolItem[],
): GameSession {
  if (selectedQuestions.length === 0) {
    throw new DomainError('INVALID_CONFIG', 'Cannot start playing without at least one question.')
  }

  const isAi = session.config.questionMode === 'ai'
  const rounds: readonly Round[] = selectedQuestions.map((item, index) => {
    const base: Round = {
      id: `round-${index + 1}-${item.id}`,
      roundNumber: index + 1,
      targetCountryCode: item.answerCountryCode,
      prompt: item.prompt,
    }
    if (!isAi) return base
    return {
      ...base,
      attempts: [],
      ...(item.aiSource ? { aiSource: item.aiSource } : {}),
    }
  })

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
        code:
          session.status === 'finished'
            ? 'GAME_FINISHED_NO_MORE_GUESSES'
            : 'GAME_NOT_IN_PLAYING_STATE',
        message:
          session.status === 'finished'
            ? 'Game finished; no more guesses.'
            : 'Session is not in playing state.',
      },
    }
  }

  if (selectedCountryCode === null) {
    return {
      success: false,
      error: {
        code: 'MAP_SELECTION_UNRESOLVED',
        message: 'Map could not resolve ISO2 for selection.',
      },
    }
  }

  const roundIndex = session.activeRoundIndex
  if (roundIndex < 0 || roundIndex >= session.rounds.length) {
    return {
      success: false,
      error: {
        code: 'ROUND_INDEX_INVALID_SUBMIT',
        message: 'Round index out of range.',
      },
    }
  }

  const currentRound = session.rounds[roundIndex]
  if (currentRound.guess) {
    return {
      success: false,
      error: {
        code: 'ROUND_ALREADY_ANSWERED',
        message: 'Round already has a guess.',
      },
    }
  }

  const expectedPlayerId = getActivePlayerIdForRound(session)
  if (!expectedPlayerId) {
    return {
      success: false,
      error: {
        code: 'ACTIVE_PLAYER_UNKNOWN',
        message: 'Could not determine active player.',
      },
    }
  }

  if (playerId !== expectedPlayerId) {
    return {
      success: false,
      error: {
        code: 'GUESS_WRONG_PLAYER_TURN',
        message: 'Not this player turn.',
      },
    }
  }

  const isCorrect = selectedCountryCode === currentRound.targetCountryCode
  const isAi = session.config.questionMode === 'ai'

  const playerIndex = session.players.findIndex((player) => player.id === playerId)
  if (playerIndex === -1) {
    return {
      success: false,
      error: {
        code: 'PLAYER_NOT_IN_SESSION',
        message: 'Player does not belong to session.',
      },
    }
  }

  if (isAi) {
    return submitAiRoundGuess({
      session,
      currentRound,
      roundIndex,
      playerId,
      playerIndex,
      selectedCountryCode,
      answeredAtISO,
      isCorrect,
    })
  }

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

interface SubmitAiRoundInput {
  readonly session: GameSession
  readonly currentRound: Round
  readonly roundIndex: number
  readonly playerId: string
  readonly playerIndex: number
  readonly selectedCountryCode: IsoCountryCode
  readonly answeredAtISO: string
  readonly isCorrect: boolean
}

function submitAiRoundGuess(
  input: SubmitAiRoundInput,
): ApiResponse<SubmitRoundGuessSuccess> {
  const previousAttempts = input.currentRound.attempts ?? []
  const previousAttemptCount = previousAttempts.length
  const nextAttemptNumber = previousAttemptCount + 1
  if (!isAiAttemptNumber(nextAttemptNumber)) {
    return {
      success: false,
      error: {
        code: 'AI_ATTEMPTS_EXCEEDED',
        message: 'No remaining AI attempts on this round.',
      },
    }
  }

  const scoreDelta = input.isCorrect ? getAiScoreForAttempt(nextAttemptNumber) : 0
  const newAttempt: AiAttempt = {
    playerId: input.playerId,
    selectedCountryCode: input.selectedCountryCode,
    isCorrect: input.isCorrect,
    attemptedAtISO: input.answeredAtISO,
    scoreDelta,
  }

  const attempts: readonly AiAttempt[] = [...previousAttempts, newAttempt]
  const isLastAttempt = attempts.length >= MAX_AI_ATTEMPTS
  const closesRound = input.isCorrect || isLastAttempt

  const guess: Guess | undefined = closesRound
    ? {
        playerId: input.playerId,
        selectedCountryCode: input.selectedCountryCode,
        isCorrect: input.isCorrect,
        answeredAtISO: input.answeredAtISO,
      }
    : undefined

  const updatedRound: Round = {
    ...input.currentRound,
    attempts,
    ...(guess ? { guess } : {}),
  }

  const updatedRounds = input.session.rounds.map((round, index) =>
    index === input.roundIndex ? updatedRound : round,
  )

  const updatedPlayers = closesRound
    ? input.session.players.map((player, index) =>
        index === input.playerIndex
          ? applyAnswerToPlayer(player, input.isCorrect, scoreDelta)
          : player,
      )
    : input.session.players

  const reportedGuess: Guess = guess ?? {
    playerId: input.playerId,
    selectedCountryCode: input.selectedCountryCode,
    isCorrect: input.isCorrect,
    answeredAtISO: input.answeredAtISO,
  }

  return {
    success: true,
    data: {
      session: {
        ...input.session,
        rounds: updatedRounds,
        players: updatedPlayers,
      },
      guess: reportedGuess,
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
        code: 'ADVANCE_NOT_PLAYING',
        message: 'Advance only while game is playing.',
      },
    }
  }

  const roundIndex = session.activeRoundIndex
  if (roundIndex < 0 || roundIndex >= session.rounds.length) {
    return {
      success: false,
      error: {
        code: 'ADVANCE_ROUND_INDEX_INVALID',
        message: 'Round index out of range.',
      },
    }
  }

  const currentRound = session.rounds[roundIndex]
  if (!currentRound.guess) {
    return {
      success: false,
      error: {
        code: 'ADVANCE_ANSWER_REQUIRED',
        message: 'Answer required before advancing.',
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
