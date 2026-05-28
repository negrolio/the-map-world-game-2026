import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '../../test/render-with-i18n'
import { WritingHandLoader } from './WritingHandLoader'

describe('WritingHandLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza SVG aria-hidden con dos imágenes (pergamino + pluma)', () => {
    renderWithI18n(<WritingHandLoader />)

    const wrapper = screen.getByTestId('writing-hand-loader')
    const svg = wrapper.querySelector('svg')
    const images = wrapper.querySelectorAll('image')

    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(images).toHaveLength(2)
  })

  it('el pergamino es PNG con alpha y se renderiza sin filter (sin chroma key residual)', () => {
    renderWithI18n(<WritingHandLoader />)

    const wrapper = screen.getByTestId('writing-hand-loader')
    const images = wrapper.querySelectorAll('image')
    const parchment = images[0]

    expect(parchment).toBeInTheDocument()
    expect(parchment).not.toHaveAttribute('filter')
    expect(parchment?.getAttribute('href')).toMatch(/parchment\.png/)
  })

  it('expone tres trazos cursivos y el grupo de la pluma con filtro de chroma key', () => {
    renderWithI18n(<WritingHandLoader />)

    const cursiveLines = document.querySelectorAll('.writing-hand-loader__cursive-line')
    const quill = document.querySelector('.writing-hand-loader__quill')
    const quillImage = quill?.querySelector('image')

    expect(cursiveLines).toHaveLength(3)
    expect(quill).toBeInTheDocument()
    expect(quillImage).toBeInTheDocument()
    expect(quillImage).toHaveAttribute('filter', 'url(#writing-hand-loader-remove-black)')
  })

  it('inyecta las keyframes top-level (animación siempre activa, sin gate de prefers-reduced-motion)', () => {
    // Desvío explícito de RF-A04 / RNF-A02 (decisión del PO 2026-05-28): el
    // loader debe verse animado incluso si el sistema operativo pide reducir
    // movimiento, porque es feedback funcional de "estoy trabajando".
    renderWithI18n(<WritingHandLoader />)

    const style = document.getElementById('writing-hand-loader-keyframes')
    expect(style?.textContent).not.toMatch(/prefers-reduced-motion/)
    expect(style?.textContent).toMatch(/@keyframes writing-hand-loader-quill\b/)
    expect(style?.textContent).toMatch(/@keyframes writing-hand-loader-quill-tilt/)
    expect(style?.textContent).toMatch(/@keyframes writing-hand-loader-cursive/)
  })

  it('anima la pluma con translate en el grupo y tilt en la imagen (pivot nib)', () => {
    renderWithI18n(<WritingHandLoader />)

    const quill = document.querySelector('.writing-hand-loader__quill')
    const quillImage = quill?.querySelector('image.writing-hand-loader__quill-tilt')

    expect(quillImage).toBeInTheDocument()
    expect(quill?.querySelector('.writing-hand-loader__quill-rotate')).toBeNull()

    const style = document.getElementById('writing-hand-loader-keyframes')
    expect(style?.textContent).toMatch(/@keyframes writing-hand-loader-quill-tilt/)
    expect(style?.textContent).toMatch(
      /translate\(25\.5px,\s*85px\)\s*rotate\(-3deg\)\s*translate\(-25\.5px,\s*-85px\)/,
    )
  })

  it('mantiene la animación incluso con matchMedia reportando reduce (desvío deliberado de RF-A04)', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      const prefersReduce = query.includes('prefers-reduced-motion') && query.includes('reduce')
      const noPreference =
        query.includes('prefers-reduced-motion') && query.includes('no-preference')
      return {
        matches: prefersReduce ? true : noPreference ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as MediaQueryList
    })

    renderWithI18n(<WritingHandLoader />)

    // El componente no consulta matchMedia en runtime y el CSS no envuelve
    // las keyframes en `@media (prefers-reduced-motion)`, por lo que la
    // animación se aplica sin importar la preferencia del sistema.
    const style = document.getElementById('writing-hand-loader-keyframes')
    expect(style?.textContent).not.toMatch(/prefers-reduced-motion/)
    expect(style?.textContent).toMatch(
      /\.writing-hand-loader__quill\s*\{[^}]*animation:\s*writing-hand-loader-quill/,
    )
  })
})
