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
})
