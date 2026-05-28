import { describe, expect, it } from 'vitest'

import type { GameSession, GameStatus } from '../types'
import { applyAntiCheatIncident, isAntiCheatActive } from './anticheat-policy'

function buildSession(
  antiCheatMode: 'normal' | 'strict',
  overrides?: {
    readonly status?: GameStatus
    readonly withGuess?: boolean
  },
): GameSession {
  const baseRound = {
    id: 'round-1',
    roundNumber: 1,
    targetCountryCode: 'AR',
    prompt: 'Argentina',
  } as const
  const round = overrides?.withGuess === true
    ? {
        ...baseRound,
        guess: {
          playerId: 'player-1',
          selectedCountryCode: 'AR',
          isCorrect: true,
          answeredAtISO: '2026-01-01T00:00:00.000Z',
        },
      }
    : baseRound
  return {
    id: 'session-1',
    status: overrides?.status ?? 'playing',
    config: {
      players: ['Ana'],
      questionMode: 'country',
      regionFilter: 'world',
      antiCheatMode,
      questionCount: 5,
    },
    players: [
      {
        id: 'player-1',
        name: 'Ana',
        turnOrder: 0,
        score: 15,
        correctAnswers: 2,
        wrongAnswers: 1,
      },
    ],
    rounds: [round],
    activeRoundIndex: 0,
    incidentCount: 0,
    datasetVersion: 'test',
  }
}

describe('applyAntiCheatIncident', () => {
  it('en modo normal incrementa incidentes y mantiene la partida en curso', () => {
    const session = buildSession('normal')
    const result = applyAntiCheatIncident(session, 'window_blur')

    expect(result.didAbortGame).toBe(false)
    expect(result.incidentSource).toBe('window_blur')
    expect(result.nextSession.status).toBe('playing')
    expect(result.nextSession.incidentCount).toBe(1)
    expect(result.nextSession.result).toBeUndefined()
  })

  it('en modo estricto aborta la partida e incluye resultado', () => {
    const session = buildSession('strict')
    const result = applyAntiCheatIncident(session, 'document_hidden')

    expect(result.didAbortGame).toBe(true)
    expect(result.incidentSource).toBe('document_hidden')
    expect(result.nextSession.status).toBe('aborted')
    expect(result.nextSession.incidentCount).toBe(1)
    expect(result.nextSession.result?.totalRounds).toBe(1)
  })
})

describe('isAntiCheatActive', () => {
  it('devuelve false con session null', () => {
    expect(isAntiCheatActive(null)).toBe(false)
  })

  it('devuelve false con status != playing', () => {
    expect(isAntiCheatActive(buildSession('strict', { status: 'setup' }))).toBe(false)
    expect(isAntiCheatActive(buildSession('strict', { status: 'finished' }))).toBe(false)
    expect(isAntiCheatActive(buildSession('strict', { status: 'aborted' }))).toBe(false)
  })

  it('devuelve false con ronda activa con guess (cerrada)', () => {
    expect(isAntiCheatActive(buildSession('strict', { withGuess: true }))).toBe(false)
  })

  it('devuelve true con ronda activa abierta durante partida', () => {
    expect(isAntiCheatActive(buildSession('strict'))).toBe(true)
    expect(isAntiCheatActive(buildSession('normal'))).toBe(true)
  })
})
