import { render, screen } from '@testing-library/react'
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
})
