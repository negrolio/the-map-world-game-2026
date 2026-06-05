import { describe, expect, it } from 'vitest'

import type { GameConfig } from '../../types'
import { validateSetupConfigSchema } from './setup-config-schema'

const validConfig: GameConfig = {
  players: ['Ana', 'Luis'],
  questionMode: 'country',
  regionFilter: 'world',
  antiCheatMode: 'normal',
  questionCount: 5,
}

const validAiConfig: GameConfig = {
  players: ['Ana', 'Luis'],
  questionMode: 'ai',
  regionFilter: 'world',
  antiCheatMode: 'strict',
  questionCount: 5,
  tags: [],
}

describe('validateSetupConfigSchema', () => {
  it('acepta una configuracion valida de setup', () => {
    const result = validateSetupConfigSchema(validConfig)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rechaza nombres vacios en jugadores', () => {
    const result = validateSetupConfigSchema({
      ...validConfig,
      players: ['   '],
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('schema.playerNameEmpty')
  })

  it('acepta configuracion AI valida con 2 jugadores y 5 preguntas', () => {
    const result = validateSetupConfigSchema(validAiConfig)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rechaza configuracion AI con mas de 2 jugadores', () => {
    const result = validateSetupConfigSchema({
      ...validAiConfig,
      players: ['Ana', 'Luis', 'Pepe'],
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('schema.aiPlayersMax')
  })

  it('rechaza configuracion AI cuando questionCount no es 5', () => {
    const result = validateSetupConfigSchema({
      ...validAiConfig,
      questionCount: 3,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('schema.aiFixedQuestionCount')
  })
})
