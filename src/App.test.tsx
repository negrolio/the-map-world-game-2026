import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { App } from './App'
import { renderWithI18n } from './test/render-with-i18n'

/** Ancho de ventana inicial de jsdom (restaurar tras tests que cambian viewport). */
const initialInnerWidth = window.innerWidth

function setTestViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  Object.defineProperty(window, 'outerWidth', { configurable: true, writable: true, value: width })
}

function restoreTestViewportWidth(): void {
  setTestViewportWidth(initialInnerWidth)
}

function clickHomeGameCard(): void {
  fireEvent.click(screen.getByTestId('home-card-game'))
}

describe('App', () => {
  afterEach(() => {
    restoreTestViewportWidth()
  })
  it('renderiza el titulo principal', () => {
    renderWithI18n(<App />)

    expect(
      screen.getByRole('heading', { name: /The Map World Game 2026/i }),
    ).toBeInTheDocument()
  })

  it('renderiza las cards de modo en la home', () => {
    renderWithI18n(<App />)

    expect(screen.getByTestId('home-card-game')).toBeInTheDocument()
    expect(screen.getByTestId('home-card-learn')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Partida/i })).toBeInTheDocument()
  })

  it('navega desde home hacia modo aprendizaje al presionar el CTA', () => {
    renderWithI18n(<App />)

    fireEvent.click(screen.getByTestId('home-card-learn'))

    expect(screen.getByTestId('learn-map-view')).toBeInTheDocument()
    expect(screen.getByTestId('world-map-root')).toBeInTheDocument()
  })

  it('navega desde home hacia setup al presionar el CTA', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()

    expect(screen.getByRole('heading', { name: /Panel de configuración/i })).toBeInTheDocument()
  })

  it('renderiza los controles base del setup panel', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()

    expect(screen.getByText(/Cantidad de jugadores/i)).toBeInTheDocument()
    expect(screen.getByText(/Modo de preguntas/i)).toBeInTheDocument()
    expect(screen.getByText(/Cobertura geográfica/i)).toBeInTheDocument()
    expect(screen.getByText(/Anti-cheat/i)).toBeInTheDocument()
    expect(screen.getByText(/Número de preguntas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar partida/i })).toBeInTheDocument()
  })

  it('bloquea iniciar partida y muestra feedback cuando la configuracion es invalida', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()

    const firstPlayerInput = screen.getByDisplayValue('Jugador 1')
    fireEvent.change(firstPlayerInput, { target: { value: '   ' } })

    expect(screen.getByText(/Configuración inválida/i)).toBeInTheDocument()
    expect(screen.getAllByText(/no pueden estar vacíos/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Iniciar partida/i })).toBeDisabled()
  })

  it('marca accesibilidad basica cuando hay error en setup', () => {
    renderWithI18n(<App />)
    clickHomeGameCard()

    const firstPlayerInput = screen.getByDisplayValue('Jugador 1')
    fireEvent.change(firstPlayerInput, { target: { value: '   ' } })

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Número de preguntas/i)).toHaveAttribute('aria-describedby', 'setup-feedback')
  })

  it('navega a la vista de partida con mapa al iniciar con configuracion valida', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    expect(screen.getByTestId('world-map-root')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Mapa mundial — 110m/i })).toBeInTheDocument()
  })

  it('muestra la pregunta de la ronda activa al iniciar la partida', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    const prompt = screen.getByTestId('round-prompt')
    expect(prompt.textContent).toMatch(/¿Dónde está |¿Dónde queda la capital /)
    expect(prompt.textContent?.length).toBeGreaterThan(12)
  })

  it('muestra HUD de jugadores y el turno activo en partida (escritorio)', () => {
    setTestViewportWidth(1200)
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    expect(screen.getByTestId('game-players-hud')).toBeInTheDocument()
    const desktopCard = screen.getByTestId('player-hud-player-1')
    expect(desktopCard).toBeVisible()
    expect(within(desktopCard).getByText('Turno')).toBeInTheDocument()
    expect(screen.getByTestId('active-turn-player')).toHaveTextContent(/Jugador 1/i)
    expect(screen.getByTestId('hud-active-player-announcement')).toHaveTextContent(/Turno actual/i)
  })

  it('muestra lista compacta de jugadores y turno en viewport estrecho (MAP-UX-03)', () => {
    setTestViewportWidth(375)
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    const mobileRow = screen.getByTestId('player-hud-mobile-player-1')
    expect(mobileRow).toBeVisible()
    expect(within(mobileRow).getByText('Turno')).toBeInTheDocument()
    expect(screen.getByTestId('active-turn-player')).toHaveTextContent(/Jugador 1/i)
    expect(screen.getByTestId('hud-active-player-announcement')).toHaveTextContent(/Turno actual/i)
  })

  it('expone semantica accesible para el mapa interactivo', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    expect(screen.getByRole('region', { name: /Mapa interactivo de países/i })).toBeInTheDocument()
    expect(screen.getByText(/Usá Tab para navegar países/i)).toBeInTheDocument()
  })

  it('en anti-cheat estricto aborta la partida al perder foco', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('radio', { name: /Estricto/i }))
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    fireEvent.blur(window)

    expect(screen.getByTestId('game-finished-status')).toHaveTextContent(/abortada por anti-cheat/i)
    expect(screen.getByTestId('anti-cheat-incidents')).toHaveTextContent(/1/)
  })

  it('permite rejugar desde resultados sin recargar la pagina', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('radio', { name: /Estricto/i }))
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))
    fireEvent.blur(window)

    expect(screen.getByTestId('game-finished-status')).toHaveTextContent(/abortada por anti-cheat/i)

    fireEvent.click(screen.getByTestId('replay-same-config-button'))

    expect(screen.getByTestId('world-map-root')).toBeInTheDocument()
    expect(screen.getByTestId('round-counter')).toHaveTextContent(/Ronda 1\s*\/\s*\d+/i)
  })

  it('renderiza el shell de partida full-screen con bandas top y bottom (MAP-UX-02)', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    expect(screen.getByTestId('game-shell')).toBeInTheDocument()
    expect(screen.getByTestId('game-overlay-top')).toBeInTheDocument()
    expect(screen.getByTestId('game-overlay-bottom')).toBeInTheDocument()
    expect(screen.getByTestId('game-overlay-nav')).toBeInTheDocument()
  })

  it('expone navegacion compacta a Setup y Home en la banda superior (F2.4)', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    const nav = screen.getByTestId('game-overlay-nav')
    expect(nav).toContainElement(screen.getByRole('button', { name: /Volver al setup/i }))
    expect(nav).toContainElement(screen.getByRole('button', { name: /Ir al home/i }))
  })

  it('quita el bloque debug "Ultimo clic ISO2" de la vista de partida (F2.8)', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    expect(screen.queryByTestId('map-click-feedback')).not.toBeInTheDocument()
    expect(screen.queryByText(/Último clic — ISO2/i)).not.toBeInTheDocument()
  })

  it('rendera el mapa en modo full-bleed dentro del shell (F2.2)', () => {
    renderWithI18n(<App />)

    clickHomeGameCard()
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    const root = screen.getByTestId('world-map-root')
    expect(root).toHaveAttribute('data-fullbleed', 'true')
  })
})
