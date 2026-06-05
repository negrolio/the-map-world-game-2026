import { describe, expect, it } from 'vitest'

import type { GameConfig } from '../types'
import { validateConfig } from './validate-config'

const buildConfig = (overrides: Partial<GameConfig> = {}): GameConfig => ({
  players: ['Ana'],
  questionMode: 'country',
  regionFilter: 'world',
  antiCheatMode: 'normal',
  questionCount: 1,
  ...overrides,
})

const buildAiConfig = (overrides: Partial<GameConfig> = {}): GameConfig =>
  buildConfig({
    questionMode: 'ai',
    antiCheatMode: 'strict',
    questionCount: 5,
    players: ['Ana', 'Luis'],
    ...overrides,
  })

describe('validateConfig', () => {
  it('invalida configuracion con 0 jugadores', () => {
    const result = validateConfig({
      config: buildConfig({ players: [] }),
      poolSize: 10,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.some((error) => error.field === 'players')).toBe(true)
  })

  it('invalida configuracion con mas de 6 jugadores', () => {
    const result = validateConfig({
      config: buildConfig({
        players: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      }),
      poolSize: 10,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.some((error) => error.field === 'players')).toBe(true)
  })

  it('invalida cantidad de preguntas por debajo del rango', () => {
    const result = validateConfig({
      config: buildConfig({ questionCount: 0 }),
      poolSize: 10,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.some((error) => error.field === 'questionCount')).toBe(true)
  })

  it('invalida cantidad de preguntas por encima del rango tras filtros', () => {
    const result = validateConfig({
      config: buildConfig({ questionCount: 6 }),
      poolSize: 3,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.some((error) => error.field === 'questionCount')).toBe(true)
  })

  it('valida una configuracion dentro de los limites', () => {
    const result = validateConfig({
      config: buildConfig({ players: ['Ana', 'Luis'], questionCount: 3 }),
      poolSize: 8,
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.questionLimits).toEqual({ min: 1, max: 8 })
  })

  it('valida configuracion AI con 2 jugadores y 5 preguntas fijas', () => {
    const result = validateConfig({
      config: buildAiConfig(),
      poolSize: 10,
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('invalida configuracion AI con mas de 2 jugadores', () => {
    const result = validateConfig({
      config: buildAiConfig({
        players: ['Ana', 'Luis', 'Pepe'],
      }),
      poolSize: 10,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'players',
          messageKey: 'validation.config.aiPlayersMax',
          messageValues: { max: 2 },
        }),
      ]),
    )
  })

  it('invalida configuracion AI cuando questionCount no es 5', () => {
    const result = validateConfig({
      config: buildAiConfig({ questionCount: 3 }),
      poolSize: 10,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'questionCount',
          messageKey: 'validation.config.aiFixedQuestionCount',
          messageValues: { count: 5 },
        }),
      ]),
    )
  })
})
