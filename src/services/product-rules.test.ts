import { describe, expect, it } from 'vitest'

import { PRODUCT_RULES, getQuestionCountLimits } from './product-rules'

describe('PRODUCT_RULES', () => {
  it('expone reglas MVP de scoring y hints', () => {
    expect(PRODUCT_RULES.players.min).toBe(1)
    expect(PRODUCT_RULES.scoring.correctAnswerPoints).toBe(10)
    expect(PRODUCT_RULES.scoring.wrongAnswerPoints).toBe(-5)
    expect(PRODUCT_RULES.hints.enabledInMvpUi).toBe(false)
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
