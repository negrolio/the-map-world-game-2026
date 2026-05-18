import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '../../test/render-with-i18n'
import { CountryLearnModal } from './CountryLearnModal'

describe('CountryLearnModal', () => {
  it('renders success content with wikipedia link', () => {
    renderWithI18n(
      <CountryLearnModal
        state={{
          status: 'success',
          profile: {
            iso2: 'AR',
            locale: 'es',
            title: 'Argentina',
            summary: 'Texto de prueba.',
            flagUrl: null,
            wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
            source: 'wikipedia',
          },
          requestedLocale: 'es',
        }}
        requestedLocale="es"
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Argentina')).toBeInTheDocument()
    expect(screen.getByText('Texto de prueba.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Leer en Wikipedia/i })
    expect(link).toHaveAttribute('href', 'https://es.wikipedia.org/wiki/Argentina')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    renderWithI18n(
      <CountryLearnModal
        state={{ status: 'loading', iso2: 'AR' }}
        requestedLocale="es"
        onClose={onClose}
        onRetry={vi.fn()}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows english content badge when effective locale differs', () => {
    renderWithI18n(
      <CountryLearnModal
        state={{
          status: 'success',
          profile: {
            iso2: 'AR',
            locale: 'en',
            title: 'Argentina',
            summary: 'Summary',
            flagUrl: null,
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Argentina',
            source: 'wikipedia',
          },
          requestedLocale: 'es',
        }}
        requestedLocale="es"
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/Contenido en inglés/i)).toBeInTheDocument()
  })
})
