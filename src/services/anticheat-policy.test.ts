import { describe, expect, it } from 'vitest'

import type { GameSession } from '../types'
import { applyAntiCheatIncident } from './anticheat-policy'

function buildSession(antiCheatMode: 'normal' | 'strict'): GameSession {
  return {
    id: 'session-1',
    status: 'playing',
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
    rounds: [
      {
        id: 'round-1',
        roundNumber: 1,
        targetCountryCode: 'AR',
        prompt: 'Argentina',
      },
    ],
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
