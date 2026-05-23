import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

import forbiddenTerms from './country-forbidden-terms.json' with { type: 'json' }

interface CatalogCountry {
  readonly iso2: string
}

interface ForbiddenEntry {
  readonly es: readonly string[]
  readonly en: readonly string[]
}

const require = createRequire(import.meta.url)
const catalog = require('../src/data/countries-catalog.json') as readonly CatalogCountry[]
const entries = forbiddenTerms as Readonly<Record<string, ForbiddenEntry>>

describe('country-forbidden-terms.json', () => {
  it('contains an entry for every iso2 in the catalog', () => {
    const catalogIso2s = catalog.map((country) => country.iso2).sort()
    const entryIso2s = Object.keys(entries).sort()
    expect(entryIso2s).toEqual(catalogIso2s)
  })

  it('every entry has non-empty es and en arrays', () => {
    for (const [iso2, entry] of Object.entries(entries)) {
      expect(entry.es.length, `${iso2}.es must not be empty`).toBeGreaterThan(0)
      expect(entry.en.length, `${iso2}.en must not be empty`).toBeGreaterThan(0)
    }
  })

  it('no string is empty or only whitespace', () => {
    for (const [iso2, entry] of Object.entries(entries)) {
      for (const term of entry.es) {
        expect(term.trim().length, `${iso2}.es has an empty term`).toBeGreaterThan(0)
      }
      for (const term of entry.en) {
        expect(term.trim().length, `${iso2}.en has an empty term`).toBeGreaterThan(0)
      }
    }
  })

  it('each iso2 entry includes the canonical country title from the catalog', () => {
    for (const country of catalog as ReadonlyArray<CatalogCountry & { name: string }>) {
      const entry = entries[country.iso2]
      const allEn = entry.en.map((s) => s.toLowerCase())
      expect(allEn, `${country.iso2} should include catalog name in en list`).toContain(
        country.name.toLowerCase(),
      )
    }
  })
})
