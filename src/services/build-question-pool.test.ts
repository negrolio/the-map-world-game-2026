import { describe, expect, it } from 'vitest'

import { countriesCatalog } from '../data'
import { buildQuestionPool } from './build-question-pool'

describe('buildQuestionPool', () => {
  it('filtra correctamente por continente', () => {
    const pool = buildQuestionPool({
      countries: countriesCatalog,
      regionFilter: 'europe',
      questionMode: 'country',
      seed: 123,
    })

    expect(pool.allQuestions).toHaveLength(2)
    expect(
      pool.allQuestions.every((question) => question.answerCountryCode === 'FR' || question.answerCountryCode === 'DE'),
    ).toBe(true)
  })

  it('incluye todos los paises en modo world', () => {
    const pool = buildQuestionPool({
      countries: countriesCatalog,
      regionFilter: 'world',
      questionMode: 'country',
      seed: 123,
    })

    expect(pool.allQuestions).toHaveLength(countriesCatalog.length)
  })

  it('acota el maximo al tamano real del pool', () => {
    const pool = buildQuestionPool({
      countries: countriesCatalog,
      regionFilter: 'africa',
      questionMode: 'country',
      requestedQuestionCount: 10,
      seed: 123,
    })

    expect(pool.maxQuestionCount).toBe(2)
    expect(pool.selectedQuestions).toHaveLength(2)
  })

  it('baraja de forma determinista cuando recibe seed', () => {
    const poolA = buildQuestionPool({
      countries: countriesCatalog,
      regionFilter: 'world',
      questionMode: 'capital',
      seed: 999,
    })
    const poolB = buildQuestionPool({
      countries: countriesCatalog,
      regionFilter: 'world',
      questionMode: 'capital',
      seed: 999,
    })

    expect(poolA.allQuestions.map((question) => question.id)).toEqual(
      poolB.allQuestions.map((question) => question.id),
    )
    expect(poolA.allQuestions.at(0)?.mode).toBe('capital')
  })
})
