import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App', () => {
  it('renderiza el titulo principal', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /The Map World Game 2026/i }),
    ).toBeInTheDocument()
  })

  it('renderiza el boton base reutilizable', () => {
    render(<App />)

    expect(screen.getAllByRole('button', { name: /Comenzar setup/i })).toHaveLength(1)
  })

  it('muestra la version de dataset en la vista dev', () => {
    render(<App />)
    expect(screen.getByText(/Dataset version:/i)).toBeInTheDocument()
  })

  it('navega desde home hacia setup al presionar el CTA', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Comenzar setup/i }))

    expect(screen.getByRole('heading', { name: /Game Setup Panel/i })).toBeInTheDocument()
  })

  it('renderiza los controles base del setup panel', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Comenzar setup/i }))

    expect(screen.getByText(/Cantidad de jugadores/i)).toBeInTheDocument()
    expect(screen.getByText(/Modo de preguntas/i)).toBeInTheDocument()
    expect(screen.getByText(/Cobertura geográfica/i)).toBeInTheDocument()
    expect(screen.getByText(/Anti-cheat/i)).toBeInTheDocument()
    expect(screen.getByText(/Número de preguntas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar partida/i })).toBeInTheDocument()
  })

  it('bloquea iniciar partida y muestra feedback cuando la configuracion es invalida', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Comenzar setup/i }))

    const firstPlayerInput = screen.getByDisplayValue('Jugador 1')
    fireEvent.change(firstPlayerInput, { target: { value: '   ' } })

    expect(screen.getByText(/Configuración inválida/i)).toBeInTheDocument()
    expect(screen.getByText(/Player names cannot be empty\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Iniciar partida/i })).toBeDisabled()
  })

  it('marca accesibilidad basica cuando hay error en setup', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Comenzar setup/i }))

    const firstPlayerInput = screen.getByDisplayValue('Jugador 1')
    fireEvent.change(firstPlayerInput, { target: { value: '   ' } })

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Número de preguntas/i)).toHaveAttribute('aria-describedby', 'setup-feedback')
  })

  it('navega a la vista de partida con mapa al iniciar con configuracion valida', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Comenzar setup/i }))
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    expect(screen.getByTestId('world-map-root')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Mapa mundial — 110m/i })).toBeInTheDocument()
  })

  it('muestra la pregunta de la ronda activa al iniciar la partida', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Comenzar setup/i }))
    fireEvent.click(screen.getByRole('button', { name: /Iniciar partida/i }))

    const prompt = screen.getByTestId('round-prompt')
    expect(prompt.textContent).toMatch(/¿Dónde está |¿Dónde queda la capital /)
    expect(prompt.textContent?.length).toBeGreaterThan(12)
  })
})
