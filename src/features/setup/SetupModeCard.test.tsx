import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '../../test/render-with-i18n'
import { SetupModeCard } from './SetupModeCard'
import { SetupModeCardGroup } from './SetupModeCardGroup'

describe('SetupModeCard', () => {
  it('renderiza el label y el test id', () => {
    renderWithI18n(
      <SetupModeCard
        mode="country"
        label="País"
        name="question-mode"
        selected={false}
        testId="setup-mode-country"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByTestId('setup-mode-country')).toBeInTheDocument()
    expect(screen.getByText('País')).toBeInTheDocument()
  })

  it('marca borde de selección cuando selected es true', () => {
    renderWithI18n(
      <SetupModeCard
        mode="capital"
        label="Capital"
        name="question-mode"
        selected
        testId="setup-mode-capital"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByTestId('setup-mode-capital')).toHaveClass('border-action')
  })

  it('invoca onSelect al elegir el radio', () => {
    const onSelect = vi.fn()
    renderWithI18n(
      <SetupModeCard
        mode="ai"
        label="IA Trivia"
        name="question-mode"
        selected={false}
        testId="setup-mode-ai"
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: /IA Trivia/i }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})

describe('SetupModeCardGroup', () => {
  it('renderiza legend, tres cards y testids del PRD', () => {
    renderWithI18n(
      <SetupModeCardGroup legend="Elegí un modo" value="country" onChange={vi.fn()} />,
    )

    expect(screen.getByText('Elegí un modo')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-country')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-capital')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-ai')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('refleja el modo seleccionado en aria-checked del radio', () => {
    renderWithI18n(
      <SetupModeCardGroup legend="Elegí un modo" value="ai" onChange={vi.fn()} />,
    )

    const aiCard = screen.getByTestId('setup-mode-ai')
    expect(within(aiCard).getByRole('radio')).toBeChecked()
    expect(within(screen.getByTestId('setup-mode-country')).getByRole('radio')).not.toBeChecked()
  })

  it('notifica onChange al seleccionar otra card', () => {
    const onChange = vi.fn()
    renderWithI18n(
      <SetupModeCardGroup legend="Elegí un modo" value="country" onChange={onChange} />,
    )

    fireEvent.click(screen.getByTestId('setup-mode-capital'))
    expect(onChange).toHaveBeenCalledWith('capital')
  })
})
