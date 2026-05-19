import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '../../test/render-with-i18n'
import { HomeModeCard } from './HomeModeCard'

describe('HomeModeCard', () => {
  it('renders title and description', () => {
    renderWithI18n(
      <HomeModeCard
        title="Partida"
        description="Una partida de geografía."
        imageUrl="/test.png"
        variant="primary"
        testId="home-card-game"
        onActivate={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Partida' })).toBeInTheDocument()
    expect(screen.getByText('Una partida de geografía.')).toBeInTheDocument()
    expect(screen.getByTestId('home-card-game')).toBeInTheDocument()
  })

  it('calls onActivate when clicked', () => {
    const onActivate = vi.fn()
    renderWithI18n(
      <HomeModeCard
        title="Modo aprendizaje"
        description="Explorá el mapa."
        imageUrl="/test.png"
        variant="secondary"
        testId="home-card-learn"
        onActivate={onActivate}
      />,
    )

    fireEvent.click(screen.getByTestId('home-card-learn'))
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('uses aria-label when provided', () => {
    renderWithI18n(
      <HomeModeCard
        title="Partida"
        description="Descripción."
        imageUrl="/test.png"
        variant="primary"
        testId="home-card-game"
        aria-label="Iniciar partida"
        onActivate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeInTheDocument()
  })
})
