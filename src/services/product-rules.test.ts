import { describe, expect, it } from 'vitest'

import { PRODUCT_RULES, getMaxPlayersForMode, getQuestionCountLimits } from './product-rules'

describe('PRODUCT_RULES', () => {
  it('expone reglas MVP de scoring y hints', () => {
    expect(PRODUCT_RULES.players.min).toBe(1)
    expect(PRODUCT_RULES.scoring.correctAnswerPoints).toBe(10)
    expect(PRODUCT_RULES.scoring.wrongAnswerPoints).toBe(-5)
    expect(PRODUCT_RULES.hints.enabledInMvpUi).toBe(false)
  })

  it('expone reglas de modo AI en setup', () => {
    expect(PRODUCT_RULES.ai.maxPlayers).toBe(2)
    expect(PRODUCT_RULES.ai.fixedQuestionCount).toBe(5)
  })
})

describe('getMaxPlayersForMode', () => {
  it('limita a 2 jugadores en modo AI', () => {
    expect(getMaxPlayersForMode('ai')).toBe(2)
  })

  it('permite hasta 6 jugadores en modos país y capital', () => {
    expect(getMaxPlayersForMode('country')).toBe(6)
    expect(getMaxPlayersForMode('capital')).toBe(6)
  })
})

describe('getQuestionCountLimits', () => {
  it('usa minimo de 1 pregunta', () => {
    expect(getQuestionCountLimits(0)).toEqual({ min: 1, max: 1 })
  })

  it('acopla el maximo al tamano del pool', () => {
    expect(getQuestionCountLimits(12)).toEqual({ min: 1, max: 12 })
  })
})
