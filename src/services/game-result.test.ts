import { describe, expect, it } from 'vitest'

import type { Player } from '../types'
import { buildGameResult } from './game-result'

describe('buildGameResult', () => {
  it('arma leaderboard ordenado y ganador en primer lugar', () => {
    const players: readonly Player[] = [
      { id: 'p2', name: 'B', turnOrder: 1, score: 10, correctAnswers: 1, wrongAnswers: 0 },
      { id: 'p1', name: 'A', turnOrder: 0, score: 20, correctAnswers: 2, wrongAnswers: 0 },
    ]
    const result = buildGameResult(players, 3)

    expect(result.totalRounds).toBe(3)
    expect(result.leaderboard.map((player) => player.id)).toEqual(['p1', 'p2'])
    expect(result.winnerPlayerId).toBe('p1')
  })
})
