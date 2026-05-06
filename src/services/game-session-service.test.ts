import { describe, expect, it } from 'vitest'

import type { GameConfig } from '../types'
import { assertValidSession, createGameSession } from './game-session-service'

const baseConfig: GameConfig = {
  players: ['Ana'],
  questionMode: 'country',
  regionFilter: 'world',
  antiCheatMode: 'normal',
  questionCount: 5,
}

describe('createGameSession', () => {
  it('crea una sesion valida con ApiResponse.success=true', () => {
    const response = createGameSession(baseConfig)

    expect(response.success).toBe(true)
    if (response.success) {
      expect(response.data.players).toHaveLength(1)
      expect(response.data.datasetVersion.length).toBeGreaterThan(0)
    }
  })

  it('retorna error tipado cuando la cantidad de jugadores es invalida', () => {
    const response = createGameSession({
      ...baseConfig,
      players: [],
    })

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('INVALID_CONFIG')
    }
  })
})

describe('assertValidSession', () => {
  it('lanza DomainError cuando no hay sesion', () => {
    expect(() => assertValidSession(undefined)).toThrowError('No active game session was found.')
  })
})
