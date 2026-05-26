import { describe, expect, it } from 'vitest'

import { createRiddleRepositoryInMemory } from './riddle-repository-in-memory.js'
import type { SaveRiddleInput } from './riddle-repository.js'

function makeSaveInput(overrides: Partial<SaveRiddleInput> = {}): SaveRiddleInput {
  return {
    iso2: 'AR',
    tag: 'historia',
    locale: 'es',
    riddle: '¿Qué país declaró su independencia un 9 de julio de 1816?',
    source: {
      origin: 'wikipedia',
      title: 'Congreso de Tucumán',
      locale: 'es',
      url: 'https://es.wikipedia.org/wiki/Congreso_de_Tucum%C3%A1n',
    },
    difficulty: 'medium',
    justification: 'cita textual',
    llmProvider: 'fake',
    validationVersion: 1,
    createdAt: 0,
    ...overrides,
  }
}

describe('createRiddleRepositoryInMemory', () => {
  it('returns miss for an empty bucket', async () => {
    const repo = createRiddleRepositoryInMemory()
    const outcome = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(outcome).toEqual({ kind: 'miss' })
  })

  it('save assigns opaque incremental ids and returns the StoredRiddle', async () => {
    const repo = createRiddleRepositoryInMemory()
    const a = await repo.save(makeSaveInput())
    const b = await repo.save(makeSaveInput())
    expect(a.id).toBe('mem-1')
    expect(b.id).toBe('mem-2')
    expect(a.iso2).toBe('AR')
    expect(a.validationVersion).toBe(1)
  })

  it('findRandomVariant returns a saved item as layer "l2"', async () => {
    const repo = createRiddleRepositoryInMemory()
    const saved = await repo.save(makeSaveInput())
    const outcome = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(outcome.kind).toBe('hit')
    if (outcome.kind === 'hit') {
      expect(outcome.layer).toBe('l2')
      expect(outcome.riddle.id).toBe(saved.id)
    }
  })

  it('respects excludedIds', async () => {
    const repo = createRiddleRepositoryInMemory()
    const a = await repo.save(makeSaveInput({ riddle: 'A' }))
    const b = await repo.save(makeSaveInput({ riddle: 'B' }))
    const outcome = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set([a.id]),
      random: () => 0,
    })
    expect(outcome.kind).toBe('hit')
    if (outcome.kind === 'hit') {
      expect(outcome.riddle.id).toBe(b.id)
    }
  })

  it('returns miss when every candidate is excluded', async () => {
    const repo = createRiddleRepositoryInMemory()
    const a = await repo.save(makeSaveInput({ riddle: 'A' }))
    const b = await repo.save(makeSaveInput({ riddle: 'B' }))
    const outcome = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set([a.id, b.id]),
      random: () => 0,
    })
    expect(outcome).toEqual({ kind: 'miss' })
  })

  it('uses random() to pick across multiple variants deterministically', async () => {
    const repo = createRiddleRepositoryInMemory()
    const a = await repo.save(makeSaveInput({ riddle: 'A' }))
    const b = await repo.save(makeSaveInput({ riddle: 'B' }))
    const c = await repo.save(makeSaveInput({ riddle: 'C' }))

    const pickFirst = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    const pickLast = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0.999,
    })

    expect(pickFirst.kind).toBe('hit')
    expect(pickLast.kind).toBe('hit')
    if (pickFirst.kind === 'hit' && pickLast.kind === 'hit') {
      expect(pickFirst.riddle.id).toBe(a.id)
      expect(pickLast.riddle.id).toBe(c.id)
      expect(b.id).not.toBe(a.id)
    }
  })

  it('keys the bucket by (iso2, tag, locale) — distinct keys do not collide', async () => {
    const repo = createRiddleRepositoryInMemory()
    const arEs = await repo.save(makeSaveInput({ iso2: 'AR', tag: 'historia', locale: 'es' }))
    const arEn = await repo.save(makeSaveInput({ iso2: 'AR', tag: 'historia', locale: 'en' }))
    const brEs = await repo.save(makeSaveInput({ iso2: 'BR', tag: 'historia', locale: 'es' }))

    const lookupArEs = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    const lookupArEn = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'en',
      excludedIds: new Set(),
      random: () => 0,
    })
    const lookupBrEs = await repo.findRandomVariant({
      iso2: 'BR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })

    expect(lookupArEs.kind === 'hit' && lookupArEs.riddle.id).toBe(arEs.id)
    expect(lookupArEn.kind === 'hit' && lookupArEn.riddle.id).toBe(arEn.id)
    expect(lookupBrEs.kind === 'hit' && lookupBrEs.riddle.id).toBe(brEs.id)
  })
})
