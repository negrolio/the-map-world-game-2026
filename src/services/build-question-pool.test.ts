import { describe, expect, it } from 'vitest'

import type { CountryRecord } from '../data'
import { countriesCatalog } from '../data'
import { buildQuestionPool } from './build-question-pool'

/** Fixture pequeña para asserts de filtro por region sin depender del catalogo global. */
const poolFixtureCountries: readonly CountryRecord[] = [
  {
    iso2: 'FR',
    iso3: 'FRA',
    name: 'France',
    continent: 'europe',
    capital: 'Paris',
  },
  {
    iso2: 'DE',
    iso3: 'DEU',
    name: 'Germany',
    continent: 'europe',
    capital: 'Berlin',
  },
  {
    iso2: 'NG',
    iso3: 'NGA',
    name: 'Nigeria',
    continent: 'africa',
    capital: 'Abuja',
  },
]

describe('buildQuestionPool', () => {
  it('filtra correctamente por continente', () => {
    const pool = buildQuestionPool({
      countries: poolFixtureCountries,
      regionFilter: 'europe',
      questionMode: 'country',
      locale: 'en',
      seed: 123,
    })

    expect(pool.allQuestions).toHaveLength(2)
    expect(
      pool.allQuestions.every(
        (question) => question.answerCountryCode === 'FR' || question.answerCountryCode === 'DE',
      ),
    ).toBe(true)
  })

  it('incluye todos los paises en modo world', () => {
    const pool = buildQuestionPool({
      countries: countriesCatalog,
      regionFilter: 'world',
      questionMode: 'country',
      locale: 'en',
      seed: 123,
    })

    expect(pool.allQuestions).toHaveLength(countriesCatalog.length)
  })

  it('acota el maximo al tamano real del pool', () => {
    const pool = buildQuestionPool({
      countries: poolFixtureCountries,
      regionFilter: 'africa',
      questionMode: 'country',
      locale: 'en',
      requestedQuestionCount: 10,
      seed: 123,
    })

    expect(pool.maxQuestionCount).toBe(1)
    expect(pool.selectedQuestions).toHaveLength(1)
  })

  it('baraja de forma determinista cuando recibe seed', () => {
    const poolA = buildQuestionPool({
      countries: poolFixtureCountries,
      regionFilter: 'world',
      questionMode: 'capital',
      locale: 'en',
      seed: 999,
    })
    const poolB = buildQuestionPool({
      countries: poolFixtureCountries,
      regionFilter: 'world',
      questionMode: 'capital',
      locale: 'en',
      seed: 999,
    })

    expect(poolA.allQuestions.map((question) => question.id)).toEqual(
      poolB.allQuestions.map((question) => question.id),
    )
    expect(poolA.allQuestions.at(0)?.mode).toBe('capital')
  })
})
