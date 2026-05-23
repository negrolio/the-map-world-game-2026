import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AiSourceLink } from './AiSourceLink'

describe('AiSourceLink', () => {
  it('renders an external link to a valid Wikipedia URL with noopener/noreferrer', () => {
    render(
      <AiSourceLink
        source={{
          title: 'Congreso de Tucumán',
          locale: 'es',
          url: 'https://es.wikipedia.org/wiki/Congreso_de_Tucum%C3%A1n',
        }}
      />,
    )
    const anchor = screen.getByRole('link', { name: /Congreso de Tucumán/i })
    expect(anchor).toBeInTheDocument()
    expect(anchor.getAttribute('href')).toMatch(/^https:\/\/es\.wikipedia\.org/)
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.getAttribute('rel')).toContain('noopener')
    expect(anchor.getAttribute('rel')).toContain('noreferrer')
  })

  it('does not render an anchor when URL is non-https', () => {
    render(
      <AiSourceLink
        source={{
          title: 'X',
          locale: 'es',
          url: 'http://es.wikipedia.org/wiki/X',
        }}
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByTestId('ai-source-link-safe-fallback')).toBeInTheDocument()
  })

  it('does not render an anchor when host is not *.wikipedia.org', () => {
    render(
      <AiSourceLink
        source={{
          title: 'X',
          locale: 'es',
          url: 'https://evil.example.com/X',
        }}
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })
})
