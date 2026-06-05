import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '../../test/render-with-i18n'
import { SetupView, type SetupViewProps } from './SetupView'

function buildSetupViewProps(overrides: Partial<SetupViewProps> = {}): SetupViewProps {
  return {
    playerCount: 1,
    players: ['Jugador 1'],
    questionMode: 'country',
    regionFilter: 'world',
    antiCheatMode: 'normal',
    questionCount: 5,
    tags: [],
    availableQuestionsForRegion: 100,
    validationResult: {
      isValid: true,
      errors: [],
      questionLimits: { min: 1, max: 100 },
    },
    schemaIsValid: true,
    schemaOnlyErrors: [],
    canStartGame: true,
    setupSubmitMessage: null,
    onPlayerCountChange: vi.fn(),
    onPlayerNameChange: vi.fn(),
    onQuestionModeChange: vi.fn(),
    onRegionFilterChange: vi.fn(),
    onAntiCheatModeChange: vi.fn(),
    onQuestionCountChange: vi.fn(),
    onTagsChange: vi.fn(),
    onStartGame: vi.fn(),
    onBackToHome: vi.fn(),
    ...overrides,
  }
}

describe('SetupView', () => {
  it('renderiza lobby con tres cards y un boton Jugar ahora', () => {
    renderWithI18n(<SetupView {...buildSetupViewProps()} />)

    expect(screen.getByTestId('setup-mode-country')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-capital')).toBeInTheDocument()
    expect(screen.getByTestId('setup-mode-ai')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Jugar ahora/i })).toHaveLength(1)
  })

  it('oculta el panel pergamino hasta presionar Opciones', () => {
    renderWithI18n(<SetupView {...buildSetupViewProps()} />)

    expect(screen.queryByText(/Anti-cheat/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Número de preguntas/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('setup-options-toggle'))

    expect(screen.getByText(/Anti-cheat/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Número de preguntas/i)).toBeInTheDocument()
  })

  it('usa label Opciones en país y Opciones (elige tags) en AI', () => {
    const { rerender } = renderWithI18n(<SetupView {...buildSetupViewProps()} />)

    expect(screen.getByTestId('setup-options-toggle')).toHaveTextContent(/^Opciones$/i)

    rerender(<SetupView {...buildSetupViewProps({ questionMode: 'ai', antiCheatMode: 'strict' })} />)

    expect(screen.getByTestId('setup-options-toggle')).toHaveTextContent(/Opciones \(elige tags\)/i)
  })

  it('despliega el panel automáticamente cuando la configuración es inválida', () => {
    renderWithI18n(
      <SetupView
        {...buildSetupViewProps({
          schemaIsValid: false,
          canStartGame: false,
          validationResult: {
            isValid: false,
            errors: [{ field: 'players', messageKey: 'validation.config.playerNamesRequired' }],
            questionLimits: { min: 1, max: 100 },
          },
        })}
      />,
    )

    expect(screen.getByText(/Configuración inválida/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Número de preguntas/i)).toBeInTheDocument()
  })

  it('oculta anti-cheat y preguntas en modo AI y muestra tags primero', () => {
    renderWithI18n(
      <SetupView
        {...buildSetupViewProps({
          questionMode: 'ai',
          antiCheatMode: 'strict',
        })}
      />,
    )

    fireEvent.click(screen.getByTestId('setup-options-toggle'))

    expect(screen.getByText(/Tags temáticos/i)).toBeInTheDocument()
    expect(screen.queryByText(/Anti-cheat/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Número de preguntas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Podés jugar entre/i)).not.toBeInTheDocument()
  })

  it('muestra anti-cheat y preguntas en modo país al abrir opciones', () => {
    renderWithI18n(<SetupView {...buildSetupViewProps()} />)

    fireEvent.click(screen.getByTestId('setup-options-toggle'))

    expect(screen.getByText(/Anti-cheat/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Número de preguntas/i)).toBeInTheDocument()
    expect(screen.queryByText(/Tags temáticos/i)).not.toBeInTheDocument()
  })

  it('no muestra cartel de configuración válida ni preview JSON', () => {
    renderWithI18n(<SetupView {...buildSetupViewProps()} />)

    expect(screen.queryByText(/Configuración válida/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Config listo para validar/i)).not.toBeInTheDocument()
  })

  it('usa label Elige un continente en el selector de región', () => {
    renderWithI18n(<SetupView {...buildSetupViewProps()} />)

    fireEvent.click(screen.getByTestId('setup-options-toggle'))

    expect(screen.getByLabelText(/Elige un continente/i)).toBeInTheDocument()
  })

  it('auto-oculta el aviso de setup tras unos segundos', () => {
    vi.useFakeTimers()
    renderWithI18n(
      <SetupView
        {...buildSetupViewProps({
          setupNotice: 'Aviso de prueba',
        })}
      />,
    )

    expect(screen.getByTestId('setup-notice')).toHaveTextContent('Aviso de prueba')
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByTestId('setup-notice')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('notifica cambio de modo desde el lobby', () => {
    const onQuestionModeChange = vi.fn()
    renderWithI18n(
      <SetupView {...buildSetupViewProps({ onQuestionModeChange })} />,
    )

    fireEvent.click(screen.getByTestId('setup-mode-ai'))
    expect(onQuestionModeChange).toHaveBeenCalledWith('ai')
  })

  it('marca la card seleccionada en el lobby', () => {
    renderWithI18n(
      <SetupView {...buildSetupViewProps({ questionMode: 'capital' })} />,
    )

    const capitalCard = screen.getByTestId('setup-mode-capital')
    expect(within(capitalCard).getByRole('radio')).toBeChecked()
  })
})
