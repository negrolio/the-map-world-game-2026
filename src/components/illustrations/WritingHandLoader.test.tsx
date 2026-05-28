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

  it('respeta prefers-reduced-motion envolviendo keyframes en no-preference', () => {
    renderWithI18n(<WritingHandLoader />)

    const style = document.getElementById('writing-hand-loader-keyframes')
    expect(style?.textContent).toMatch(/prefers-reduced-motion:\s*no-preference/)
    expect(style?.textContent).toMatch(/@keyframes writing-hand-loader-quill\b/)
    expect(style?.textContent).toMatch(/@keyframes writing-hand-loader-quill-rotate/)
    expect(style?.textContent).toMatch(/@keyframes writing-hand-loader-cursive/)
  })

  it('aplica un grupo de rotación anidado a la pluma con pivot en la nib (110,170)', () => {
    renderWithI18n(<WritingHandLoader />)

    const quill = document.querySelector('.writing-hand-loader__quill')
    const rotateGroup = quill?.querySelector('.writing-hand-loader__quill-rotate')
    const quillImage = rotateGroup?.querySelector('image')

    expect(rotateGroup).toBeInTheDocument()
    expect(quillImage).toBeInTheDocument()

    const style = document.getElementById('writing-hand-loader-keyframes')
    expect(style?.textContent).toMatch(/transform-box:\s*view-box/)
    expect(style?.textContent).toMatch(/transform-origin:\s*110px\s+170px/)
  })

  it('con matchMedia en reduce no aplica animación al grupo de la pluma fuera del media query', () => {
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

    const quill = document.querySelector('.writing-hand-loader__quill')
    expect(quill).toBeInTheDocument()
    // En jsdom no se computa el media query; lo que validamos es que la
    // animación vive dentro de `@media (prefers-reduced-motion: no-preference)`
    // (verificado en el test anterior) y no como animación inline en el grupo.
    expect(quill).not.toHaveStyle({ animation: expect.stringMatching(/writing-hand-loader/) })
  })
})
