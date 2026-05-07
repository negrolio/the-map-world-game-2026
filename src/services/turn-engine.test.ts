import { describe, expect, it } from 'vitest'

import type { GameConfig, GameSession, Player } from '../types'
import { getActivePlayerIdForRound, getActivePlayerForRound, sortPlayersByTurnOrder } from './turn-engine'

const baseConfig: GameConfig = {
  players: ['A', 'B', 'C'],
  questionMode: 'country',
  regionFilter: 'world',
  antiCheatMode: 'normal',
  questionCount: 10,
}

function sessionWithPlayersAndRounds(
  players: readonly Player[],
  roundCount: number,
  activeRoundIndex: number,
): GameSession {
  const rounds = Array.from({ length: roundCount }, (_, index) => ({
    id: `r-${index + 1}`,
    roundNumber: index + 1,
    targetCountryCode: 'AR',
    prompt: `P${index + 1}`,
  }))

  return {
    id: 's',
    status: 'playing',
    config: baseConfig,
    players,
    rounds,
    activeRoundIndex,
    incidentCount: 0,
    datasetVersion: 't',
  }
}

describe('sortPlayersByTurnOrder', () => {
  it('ordena por turnOrder ascendente', () => {
    const players: readonly Player[] = [
      { id: 'p3', name: 'Tres', turnOrder: 2, score: 0, correctAnswers: 0, wrongAnswers: 0 },
      { id: 'p1', name: 'Uno', turnOrder: 0, score: 0, correctAnswers: 0, wrongAnswers: 0 },
      { id: 'p2', name: 'Dos', turnOrder: 1, score: 0, correctAnswers: 0, wrongAnswers: 0 },
    ]
    const sorted = sortPlayersByTurnOrder(players)
    expect(sorted.map((player) => player.id)).toEqual(['p1', 'p2', 'p3'])
  })
})

describe('getActivePlayerIdForRound', () => {
  const threePlayers: readonly Player[] = [
    { id: 'player-1', name: 'Ana', turnOrder: 0, score: 0, correctAnswers: 0, wrongAnswers: 0 },
    { id: 'player-2', name: 'Ben', turnOrder: 1, score: 0, correctAnswers: 0, wrongAnswers: 0 },
    { id: 'player-3', name: 'Cruz', turnOrder: 2, score: 0, correctAnswers: 0, wrongAnswers: 0 },
  ]

  it('rota en círculo: ronda 0 → primer jugador, 1 → segundo, 3 → primero de nuevo', () => {
    const s0 = sessionWithPlayersAndRounds(threePlayers, 5, 0)
    expect(getActivePlayerIdForRound(s0)).toBe('player-1')

    const s1 = sessionWithPlayersAndRounds(threePlayers, 5, 1)
    expect(getActivePlayerIdForRound(s1)).toBe('player-2')

    const s2 = sessionWithPlayersAndRounds(threePlayers, 5, 2)
    expect(getActivePlayerIdForRound(s2)).toBe('player-3')

    const s3 = sessionWithPlayersAndRounds(threePlayers, 5, 3)
    expect(getActivePlayerIdForRound(s3)).toBe('player-1')
  })

  it('con un solo jugador siempre es ese id', () => {
    const one: readonly Player[] = [
      { id: 'player-1', name: 'Solo', turnOrder: 0, score: 0, correctAnswers: 0, wrongAnswers: 0 },
    ]
    const s = sessionWithPlayersAndRounds(one, 4, 2)
    expect(getActivePlayerIdForRound(s)).toBe('player-1')
  })

  it('devuelve undefined si índice de ronda inválido', () => {
    const s = sessionWithPlayersAndRounds(threePlayers, 2, 5)
    expect(getActivePlayerIdForRound(s)).toBeUndefined()
  })
})

describe('getActivePlayerForRound', () => {
  it('devuelve el objeto Player activo', () => {
    const players: readonly Player[] = [
      { id: 'player-1', name: 'Ana', turnOrder: 0, score: 3, correctAnswers: 0, wrongAnswers: 0 },
    ]
    const s = sessionWithPlayersAndRounds(players, 3, 0)
    const active = getActivePlayerForRound(s)
    expect(active?.name).toBe('Ana')
    expect(active?.score).toBe(3)
  })
})
