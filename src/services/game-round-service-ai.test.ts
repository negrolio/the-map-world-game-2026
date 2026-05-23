import { describe, expect, it } from 'vitest'

import type { GameConfig, GameSession } from '../types'
import type { QuestionPoolItem } from './build-question-pool'
import {
  advanceToNextRoundOrFinish,
  beginPlayingSession,
  submitRoundGuess,
} from './game-round-service'

const aiConfig: GameConfig = {
  players: ['Ana'],
  questionMode: 'ai',
  regionFilter: 'world',
  antiCheatMode: 'strict',
  questionCount: 1,
  tags: ['historia'],
}

function aiSession(targetIso = 'AR'): GameSession {
  const base: GameSession = {
    id: 'session-test',
    status: 'setup',
    config: aiConfig,
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
      id: 'ai-AR',
      answerCountryCode: targetIso,
      prompt:
        '¿Qué país declaró su independencia un 9 de julio de 1816 tras un congreso histórico?',
      mode: 'ai',
      aiSource: {
        title: 'Congreso de Tucumán',
        locale: 'es',
        url: 'https://es.wikipedia.org/wiki/Congreso_de_Tucum%C3%A1n',
      },
    },
  ]

  return beginPlayingSession(base, items)
}

const answeredAt = '2026-05-06T12:00:00.000Z'

describe('beginPlayingSession (modo AI)', () => {
  it('inicializa attempts: [] y aiSource cuando el item tiene origen AI', () => {
    const session = aiSession()
    const round = session.rounds[0]
    expect(round.attempts).toEqual([])
    expect(round.aiSource?.title).toBe('Congreso de Tucumán')
  })
})

describe('submitRoundGuess (modo AI)', () => {
  it('acierto en 1.º intento: +1 score, ronda cerrada, attempts.length === 1', () => {
    const session = aiSession()
    const result = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    const updatedRound = result.data.session.rounds[0]
    expect(updatedRound.guess?.isCorrect).toBe(true)
    expect(updatedRound.attempts).toHaveLength(1)
    expect(result.data.session.players[0].score).toBe(1)
  })

  it('fallo en 1.º, fallo en 2.º, acierto en 3.º: +0.25 al cerrar la ronda', () => {
    let session = aiSession()

    const r1 = submitRoundGuess({
      session,
      selectedCountryCode: 'BR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(r1.success).toBe(true)
    if (!r1.success) return
    session = r1.data.session
    expect(session.players[0].score).toBe(0)
    expect(session.rounds[0].guess).toBeUndefined()
    expect(session.rounds[0].attempts).toHaveLength(1)

    const r2 = submitRoundGuess({
      session,
      selectedCountryCode: 'CL',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(r2.success).toBe(true)
    if (!r2.success) return
    session = r2.data.session
    expect(session.players[0].score).toBe(0)
    expect(session.rounds[0].guess).toBeUndefined()
    expect(session.rounds[0].attempts).toHaveLength(2)

    const r3 = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(r3.success).toBe(true)
    if (!r3.success) return
    session = r3.data.session
    expect(session.rounds[0].guess?.isCorrect).toBe(true)
    expect(session.rounds[0].attempts).toHaveLength(3)
    expect(session.players[0].score).toBe(0.25)
    expect(session.players[0].correctAnswers).toBe(1)
  })

  it('tres fallos consecutivos: ronda se cierra como incorrecta, score = 0', () => {
    let session = aiSession()
    for (const candidate of ['BR', 'CL', 'PE']) {
      const result = submitRoundGuess({
        session,
        selectedCountryCode: candidate,
        playerId: 'player-1',
        answeredAtISO: answeredAt,
      })
      expect(result.success).toBe(true)
      if (!result.success) return
      session = result.data.session
    }
    const round = session.rounds[0]
    expect(round.guess?.isCorrect).toBe(false)
    expect(round.attempts).toHaveLength(3)
    expect(session.players[0].score).toBe(0)
    expect(session.players[0].wrongAnswers).toBe(1)
  })

  it('rechaza submit si la ronda ya estaba cerrada', () => {
    let session = aiSession()
    const ok = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(ok.success).toBe(true)
    if (!ok.success) return
    session = ok.data.session

    const second = submitRoundGuess({
      session,
      selectedCountryCode: 'BR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(second.success).toBe(false)
    if (second.success) return
    expect(second.error.code).toBe('ROUND_ALREADY_ANSWERED')
  })

  it('advanceToNextRoundOrFinish funciona después de cerrar la ronda AI', () => {
    let session = aiSession()
    const ok = submitRoundGuess({
      session,
      selectedCountryCode: 'AR',
      playerId: 'player-1',
      answeredAtISO: answeredAt,
    })
    expect(ok.success).toBe(true)
    if (!ok.success) return
    session = ok.data.session
    const advance = advanceToNextRoundOrFinish(session)
    expect(advance.success).toBe(true)
    if (!advance.success) return
    expect(advance.data.status).toBe('finished')
  })
})
