import { describe, expect, it, vi } from 'vitest'

import { createRiddleRepositoryInMemory } from './riddle-repository-in-memory.js'
import { createRiddleRepositoryWithL1 } from './riddle-repository-l1.js'
import type {
  FindRandomVariantInput,
  FindRandomVariantOutcome,
  RiddleRepository,
  SaveRiddleInput,
  StoredRiddle,
} from './riddle-repository.js'

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

function makeStored(id: string, overrides: Partial<StoredRiddle> = {}): StoredRiddle {
  return { id, ...makeSaveInput(), ...overrides }
}

interface SpyInner {
  readonly repo: RiddleRepository
  readonly stats: { findCalls: number; saveCalls: number }
}

function spyRepository(outcome: FindRandomVariantOutcome): SpyInner {
  const stats = { findCalls: 0, saveCalls: 0 }
  const repo: RiddleRepository = {
    async findRandomVariant(input: FindRandomVariantInput) {
      void input
      stats.findCalls += 1
      return outcome
    },
    async save(input: SaveRiddleInput): Promise<StoredRiddle> {
      stats.saveCalls += 1
      return { id: `inner-${String(stats.saveCalls)}`, ...input }
    },
  }
  return { repo, stats }
}

describe('createRiddleRepositoryWithL1', () => {
  it('hits the inner repository on first lookup and populates L1', async () => {
    const stored = makeStored('inner-1')
    const inner = spyRepository({ kind: 'hit', layer: 'l2', riddle: stored })
    const repo = createRiddleRepositoryWithL1(inner.repo)

    const first = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(first.kind).toBe('hit')
    if (first.kind === 'hit') {
      expect(first.layer).toBe('l2')
      expect(first.riddle.id).toBe(stored.id)
    }
    expect(inner.stats.findCalls).toBe(1)

    const second = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(second.kind).toBe('hit')
    if (second.kind === 'hit') {
      expect(second.layer).toBe('l1')
      expect(second.riddle.id).toBe(stored.id)
    }
    expect(inner.stats.findCalls).toBe(1)
  })

  it('write-through: save persists to inner and populates L1', async () => {
    const innerSave = vi.fn(async (input: SaveRiddleInput): Promise<StoredRiddle> => ({
      id: 'inner-7',
      ...input,
    }))
    const innerFind = vi.fn(
      async (input: FindRandomVariantInput): Promise<FindRandomVariantOutcome> => {
        void input
        return { kind: 'miss' }
      },
    )
    const inner: RiddleRepository = {
      findRandomVariant: innerFind,
      save: innerSave,
    }
    const repo = createRiddleRepositoryWithL1(inner)

    const saved = await repo.save(makeSaveInput())
    expect(innerSave).toHaveBeenCalledTimes(1)
    expect(saved.id).toBe('inner-7')

    const lookup = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(lookup.kind).toBe('hit')
    if (lookup.kind === 'hit') {
      expect(lookup.layer).toBe('l1')
      expect(lookup.riddle.id).toBe('inner-7')
    }
    expect(innerFind).not.toHaveBeenCalled()
  })

  it('does not populate L1 when inner returns "unavailable"', async () => {
    const inner = spyRepository({ kind: 'unavailable' })
    const repo = createRiddleRepositoryWithL1(inner.repo)

    const first = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(first.kind).toBe('unavailable')

    const second = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(second.kind).toBe('unavailable')
    expect(inner.stats.findCalls).toBe(2)
  })

  it('does not populate L1 when inner returns "miss"', async () => {
    const inner = spyRepository({ kind: 'miss' })
    const repo = createRiddleRepositoryWithL1(inner.repo)

    await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(inner.stats.findCalls).toBe(2)
  })

  it('respects excludedIds against both L1 and inner', async () => {
    const memory = createRiddleRepositoryInMemory()
    const a = await memory.save(makeSaveInput({ riddle: 'A' }))
    const b = await memory.save(makeSaveInput({ riddle: 'B' }))
    const repo = createRiddleRepositoryWithL1(memory)

    const firstA = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set([b.id]),
      random: () => 0,
    })
    expect(firstA.kind).toBe('hit')
    if (firstA.kind === 'hit') {
      expect(firstA.layer).toBe('l2')
      expect(firstA.riddle.id).toBe(a.id)
    }

    const repeatA = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(repeatA.kind).toBe('hit')
    if (repeatA.kind === 'hit') {
      expect(repeatA.layer).toBe('l1')
      expect(repeatA.riddle.id).toBe(a.id)
    }

    const firstB = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set([a.id]),
      random: () => 0,
    })
    expect(firstB.kind).toBe('hit')
    if (firstB.kind === 'hit') {
      expect(firstB.layer).toBe('l2')
      expect(firstB.riddle.id).toBe(b.id)
    }

    const repeatBFromL1 = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set([a.id]),
      random: () => 0,
    })
    expect(repeatBFromL1.kind).toBe('hit')
    if (repeatBFromL1.kind === 'hit') {
      expect(repeatBFromL1.layer).toBe('l1')
      expect(repeatBFromL1.riddle.id).toBe(b.id)
    }

    const allExcluded = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set([a.id, b.id]),
      random: () => 0,
    })
    expect(allExcluded.kind).toBe('miss')
  })

  it('does not duplicate entries in L1 when inner serves the same id twice', async () => {
    const stored = makeStored('inner-dup')
    let calls = 0
    const inner: RiddleRepository = {
      async findRandomVariant(): Promise<FindRandomVariantOutcome> {
        calls += 1
        return { kind: 'hit', layer: 'l2', riddle: stored }
      },
      async save(input: SaveRiddleInput): Promise<StoredRiddle> {
        return { id: 'inner-x', ...input }
      },
    }
    const repo = createRiddleRepositoryWithL1(inner)

    await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(calls).toBe(1)

    const lookupExcluded = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set([stored.id]),
      random: () => 0,
    })
    expect(lookupExcluded.kind).toBe('hit')
    if (lookupExcluded.kind === 'hit') {
      expect(lookupExcluded.layer).toBe('l2')
    }
    expect(calls).toBe(2)

    const lookupVisible = await repo.findRandomVariant({
      iso2: 'AR',
      tag: 'historia',
      locale: 'es',
      excludedIds: new Set(),
      random: () => 0,
    })
    expect(lookupVisible.kind).toBe('hit')
    if (lookupVisible.kind === 'hit') {
      expect(lookupVisible.layer).toBe('l1')
    }
  })
})
