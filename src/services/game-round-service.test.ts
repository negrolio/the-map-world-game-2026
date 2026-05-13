import { describe, expect, it } from 'vitest'

import type { GameConfig, GameSession, Round } from '../types'
import { DomainError } from '../types'
import type { QuestionPoolItem } from './build-question-pool'
import { advanceToNextRoundOrFinish, beginPlayingSession, submitRoundGuess } from './game-round-service'
import { PRODUCT_RULES } from './product-rules'

const baseConfig: GameConfig = {
  players: ['Ana'],
  questionMode: 'country',
  regionFilter: 'world',
  antiCheatMode: 'normal',
  questionCount: 2,
}

function playingSessionWithOneRound(targetIso: string): GameSession {
  const baseSession: GameSession = {
    id: 'session-test',
    status: 'setup',
    config: baseConfig,
    players: [
      {
        id: 'player-1',
        name: 'Ana',
        turnOrder: 0,
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
      },
    ],
    rounds: [],
    activeRoundIndex: 0,
    incidentCount: 0,
    datasetVersion: 'test',
  }

  const items: readonly QuestionPoolItem[] = [
    {
      id: 'country-AR',
      answerCountryCode: targetIso,
      prompt: 'Argentina',
      mode: 'country',
    },
  ]

  return beginPlayingSession(baseSession, items)
}

describe('beginPlayingSession', () => {
  it('arma rondas desde el pool y pasa a playing', () => {
    const session = playingSessionWithOneRound('AR')

    expect(session.status).toBe('playing')
    expect(session.rounds).toHaveLength(1)
    expect(session.rounds[0]?.targetCountryCode).toBe('AR')
    expect(session.rounds[0]?.prompt).toBe('Argentina')
    expect(session.activeRoundIndex).toBe(0)
  })

  it('lanza DomainError si el pool está vacío', () => {
    const empty: GameSession = {
      id: 's',
      status: 'setup',
      config: baseConfig,
      players: [],
      rounds: [],
      activeRoundIndex: 0,
      incidentCount: 0,
      datasetVersion: 'test',
    }

    expect(() => beginPlayingSession(empty, [])).toThrow(DomainError)
  })
})

describe('submitRoundGuess', () => {
  const answeredAt = '2026-05-06T12:00:00.000Z'

  it('registra acierto y actualiza puntaje del jugador', () => {
    const session = playingSessionWithOneRound('AR')
    const result = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data.guess.isCorrect).toBe(true)
    expect(result.data.guess.selectedCountryCode).toBe('AR')
    expect(result.data.session.players[0]?.score).toBe(PRODUCT_RULES.scoring.correctAnswerPoints)
    expect(result.data.session.players[0]?.correctAnswers).toBe(1)
    const round = result.data.session.rounds[0] as Round | undefined
    expect(round?.guess?.isCorrect).toBe(true)
  })

  it('registra error y resta puntos cuando el país no coincide', () => {
    const session = playingSessionWithOneRound('AR')
    const result = submitRoundGuess({
      session,
      selectedCountryCode: 'BR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data.guess.isCorrect).toBe(false)
    expect(result.data.session.players[0]?.score).toBe(PRODUCT_RULES.scoring.wrongAnswerPoints)
    expect(result.data.session.players[0]?.wrongAnswers).toBe(1)
  })

  it('rechaza segundo intento en la misma ronda', () => {
    const session = playingSessionWithOneRound('AR')
    const first = submitRoundGuess({
      session,
      selectedCountryCode: 'BR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(first.success).toBe(true)
    if (!first.success) {
      return
    }

    const second = submitRoundGuess({
      session: first.data.session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })

    expect(second.success).toBe(false)
    if (second.success) {
      return
    }
    expect(second.error.code).toBe('ROUND_ALREADY_ANSWERED')
  })

  it('rechaza selección sin ISO resuelto', () => {
    const session = playingSessionWithOneRound('AR')
    const result = submitRoundGuess({
      session,
      selectedCountryCode: null,
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.code).toBe('MAP_SELECTION_UNRESOLVED')
  })

  it('rechaza respuestas cuando la partida ya finalizo', () => {
    const session: GameSession = {
      id: 'session-test',
      status: 'finished',
      config: baseConfig,
      players: [
        { id: 'player-1', name: 'Ana', turnOrder: 0, score: 0, correctAnswers: 0, wrongAnswers: 0 },
      ],
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          targetCountryCode: 'AR',
          prompt: 'Argentina',
          guess: {
            playerId: 'player-1',
            selectedCountryCode: 'AR',
            isCorrect: true,
            answeredAtISO: answeredAt,
          },
        },
      ],
      activeRoundIndex: 0,
      incidentCount: 0,
      datasetVersion: 'test',
    }

    const result = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.code).toBe('GAME_FINISHED_NO_MORE_GUESSES')
  })

  it('rechaza respuestas cuando la sesion no esta en playing', () => {
    const session: GameSession = {
      id: 'session-test',
      status: 'setup',
      config: baseConfig,
      players: [
        { id: 'player-1', name: 'Ana', turnOrder: 0, score: 0, correctAnswers: 0, wrongAnswers: 0 },
      ],
      rounds: [],
      activeRoundIndex: 0,
      incidentCount: 0,
      datasetVersion: 'test',
    }

    const result = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.code).toBe('GAME_NOT_IN_PLAYING_STATE')
  })

  it('rechaza respuesta si no es el turno del jugador', () => {
    const session: GameSession = {
      id: 'session-test',
      status: 'playing',
      config: { ...baseConfig, players: ['A', 'B'] },
      players: [
        { id: 'player-1', name: 'A', turnOrder: 0, score: 0, correctAnswers: 0, wrongAnswers: 0 },
        { id: 'player-2', name: 'B', turnOrder: 1, score: 0, correctAnswers: 0, wrongAnswers: 0 },
      ],
      rounds: [
        {
          id: 'r1',
          roundNumber: 1,
          targetCountryCode: 'AR',
          prompt: 'x',
          guess: {
            playerId: 'player-1',
            selectedCountryCode: 'AR',
            isCorrect: true,
            answeredAtISO: answeredAt,
          },
        },
        { id: 'r2', roundNumber: 2, targetCountryCode: 'BR', prompt: 'y' },
      ],
      activeRoundIndex: 1,
      incidentCount: 0,
      datasetVersion: 'test',
    }

    const wrongTurn = submitRoundGuess({
      session,
      selectedCountryCode: 'BR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(wrongTurn.success).toBe(false)
    if (wrongTurn.success) {
      return
    }
    expect(wrongTurn.error.code).toBe('GUESS_WRONG_PLAYER_TURN')

    const ok = submitRoundGuess({
      session,
      selectedCountryCode: 'BR',
      playerId: 'player-2',
      answeredAtISO: answeredAt,
    })
    expect(ok.success).toBe(true)
  })
})

describe('advanceToNextRoundOrFinish', () => {
  const answeredAt = '2026-05-06T12:00:00.000Z'

  function twoRoundSession(): GameSession {
    const baseSession: GameSession = {
      id: 'session-test',
      status: 'setup',
      config: baseConfig,
      players: [
        {
          id: 'player-1',
          name: 'Ana',
          turnOrder: 0,
          score: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
        },
      ],
      rounds: [],
      activeRoundIndex: 0,
      incidentCount: 0,
      datasetVersion: 'test',
    }

    const items: readonly QuestionPoolItem[] = [
      { id: 'a', answerCountryCode: 'AR', prompt: 'Argentina', mode: 'country' },
      { id: 'b', answerCountryCode: 'BR', prompt: 'Brazil', mode: 'country' },
    ]

    return beginPlayingSession(baseSession, items)
  }

  it('rechaza avance si la ronda activa no tiene respuesta', () => {
    const session = twoRoundSession()
    const result = advanceToNextRoundOrFinish(session)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error.code).toBe('ADVANCE_ANSWER_REQUIRED')
  })

  it('avanza al siguiente índice cuando no es la última ronda', () => {
    let session = twoRoundSession()
    const answered = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(answered.success).toBe(true)
    if (!answered.success) {
      return
    }
    session = answered.data.session

    const result = advanceToNextRoundOrFinish(session)
    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data.status).toBe('playing')
    expect(result.data.activeRoundIndex).toBe(1)
    expect(result.data.rounds[1]?.prompt).toBe('Brazil')
  })

  it('marca finished tras la última ronda respondida', () => {
    let session = playingSessionWithOneRound('AR')
    const answered = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(answered.success).toBe(true)
    if (!answered.success) {
      return
    }
    session = answered.data.session

    const result = advanceToNextRoundOrFinish(session)
    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data.status).toBe('finished')
    expect(result.data.activeRoundIndex).toBe(0)
    expect(result.data.result?.totalRounds).toBe(1)
    expect(result.data.result?.leaderboard[0]?.id).toBe('player-1')
    expect(result.data.result?.winnerPlayerId).toBe('player-1')
  })
})
