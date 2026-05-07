import { describe, expect, it } from 'vitest'

import type { Player } from '../types'
import { buildLeaderboard, comparePlayersForLeaderboard } from './ranking'

function p(
  id: string,
  name: string,
  turnOrder: number,
  score: number,
  correct: number,
  wrong: number,
): Player {
  return { id, name, turnOrder, score, correctAnswers: correct, wrongAnswers: wrong }
}

describe('ranking', () => {
  it('ordena por puntos descendente', () => {
    const players = [p('a', 'A', 0, 10, 1, 0), p('b', 'B', 1, 30, 2, 0)]
    expect(buildLeaderboard(players).map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('desempata por más aciertos con mismo puntaje', () => {
    const players = [
      p('a', 'A', 0, 20, 2, 0),
      p('b', 'B', 1, 20, 3, 1),
    ]
    expect(buildLeaderboard(players)[0]?.id).toBe('b')
  })

  it('desempata por menos errores con mismos puntos y aciertos', () => {
    const players = [
      p('a', 'A', 0, 10, 1, 2),
      p('b', 'B', 1, 10, 1, 0),
    ]
    expect(buildLeaderboard(players)[0]?.id).toBe('b')
  })

  it('desempata por turnOrder y luego nombre', () => {
    const players = [
      p('z', 'Zoe', 2, 5, 1, 0),
      p('m', 'Mia', 1, 5, 1, 0),
      p('a', 'Ana', 0, 5, 1, 0),
    ]
    const order = buildLeaderboard(players).map((x) => x.id)
    expect(order).toEqual(['a', 'm', 'z'])
  })

  it('comparePlayersForLeaderboard es antisimétrico', () => {
    const x = p('a', 'A', 0, 10, 1, 0)
    const y = p('b', 'B', 1, 5, 1, 0)
    expect(comparePlayersForLeaderboard(x, y)).toBeLessThan(0)
    expect(comparePlayersForLeaderboard(y, x)).toBeGreaterThan(0)
  })
})
