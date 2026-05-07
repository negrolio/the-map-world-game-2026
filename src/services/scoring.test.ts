import { describe, expect, it } from 'vitest'

import type { Player } from '../types'
import { PRODUCT_RULES } from './product-rules'
import { applyAnswerToPlayer, answerAccuracyPercent } from './scoring'

describe('scoring', () => {
  const basePlayer: Player = {
    id: 'p1',
    name: 'Ana',
    turnOrder: 0,
    score: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
  }

  it('suma puntos y aciertos en respuesta correcta', () => {
    const next = applyAnswerToPlayer(basePlayer, true)
    expect(next.score).toBe(PRODUCT_RULES.scoring.correctAnswerPoints)
    expect(next.correctAnswers).toBe(1)
    expect(next.wrongAnswers).toBe(0)
  })

  it('resta puntos y suma errores en respuesta incorrecta', () => {
    const next = applyAnswerToPlayer(basePlayer, false)
    expect(next.score).toBe(PRODUCT_RULES.scoring.wrongAnswerPoints)
    expect(next.correctAnswers).toBe(0)
    expect(next.wrongAnswers).toBe(1)
  })

  describe('answerAccuracyPercent', () => {
    it('devuelve 0 sin respuestas', () => {
      expect(answerAccuracyPercent(0, 0)).toBe(0)
    })

    it('calcula porcentaje redondeado', () => {
      expect(answerAccuracyPercent(3, 1)).toBe(75)
      expect(answerAccuracyPercent(1, 0)).toBe(100)
    })
  })
})
