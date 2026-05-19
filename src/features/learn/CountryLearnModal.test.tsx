import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '../../test/render-with-i18n'
import { CountryLearnModal } from './CountryLearnModal'

const baseProfile = {
  iso2: 'AR',
  locale: 'es' as const,
  contentLocale: 'es' as const,
  displayName: 'Argentina',
  title: 'Argentina',
  summary: 'Texto de prueba.',
  flagUrl: null,
  wikipediaUrl: 'https://es.wikipedia.org/wiki/Argentina',
  source: 'wikipedia' as const,
}

describe('CountryLearnModal', () => {
  it('renders success content with wikipedia link', () => {
    renderWithI18n(
      <CountryLearnModal
        state={{
          status: 'success',
          profile: baseProfile,
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

  it('shows english content badge when content locale differs', () => {
    renderWithI18n(
      <CountryLearnModal
        state={{
          status: 'success',
          profile: {
            ...baseProfile,
            locale: 'es',
            contentLocale: 'en',
            displayName: 'Argentina',
            title: 'Argentina',
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Argentina',
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
