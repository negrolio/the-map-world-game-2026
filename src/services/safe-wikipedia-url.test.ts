import { describe, expect, it } from 'vitest'

import { isSafeWikipediaUrl } from './safe-wikipedia-url'

describe('isSafeWikipediaUrl', () => {
  it('acepta HTTPS sobre es.wikipedia.org', () => {
    expect(
      isSafeWikipediaUrl('https://es.wikipedia.org/wiki/Argentina'),
    ).toBe(true)
  })

  it('acepta HTTPS sobre en.wikipedia.org', () => {
    expect(
      isSafeWikipediaUrl('https://en.wikipedia.org/wiki/Argentina'),
    ).toBe(true)
  })

  it('acepta otros subdominios *.wikipedia.org', () => {
    expect(
      isSafeWikipediaUrl('https://fr.wikipedia.org/wiki/Argentine'),
    ).toBe(true)
    expect(
      isSafeWikipediaUrl('https://commons.wikipedia.org/Test'),
    ).toBe(true)
  })

  it('rechaza HTTP (no HTTPS)', () => {
    expect(
      isSafeWikipediaUrl('http://es.wikipedia.org/wiki/Argentina'),
    ).toBe(false)
  })

  it('rechaza esquemas no http(s)', () => {
    expect(isSafeWikipediaUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeWikipediaUrl('ftp://es.wikipedia.org/file')).toBe(false)
    expect(
      isSafeWikipediaUrl('data:text/html,<script>alert(1)</script>'),
    ).toBe(false)
  })

  it('rechaza dominios fuera de wikipedia.org', () => {
    expect(isSafeWikipediaUrl('https://evil.example.com/X')).toBe(false)
    expect(isSafeWikipediaUrl('https://wikipedia.com/wiki/X')).toBe(false)
    expect(isSafeWikipediaUrl('https://es.wikipedia.evil.com/X')).toBe(false)
  })

  it('rechaza hostnames con sufijo wikipedia.org pero distinto TLD/host', () => {
    expect(isSafeWikipediaUrl('https://fake-wikipedia.org/X')).toBe(false)
    expect(isSafeWikipediaUrl('https://wikipedia.org.evil.com/X')).toBe(false)
  })

  it('acepta el host raíz wikipedia.org cuando viene con subdominio', () => {
    expect(isSafeWikipediaUrl('https://en.m.wikipedia.org/wiki/X')).toBe(true)
  })

  it('rechaza el host raíz pelado wikipedia.org (sin subdominio)', () => {
    expect(isSafeWikipediaUrl('https://wikipedia.org/wiki/X')).toBe(false)
  })

  it('rechaza strings vacíos o malformados', () => {
    expect(isSafeWikipediaUrl('')).toBe(false)
    expect(isSafeWikipediaUrl('not-a-url')).toBe(false)
    expect(isSafeWikipediaUrl('https://')).toBe(false)
  })
})
