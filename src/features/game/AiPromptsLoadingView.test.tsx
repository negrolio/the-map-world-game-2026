import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '../../test/render-with-i18n'
import { AiPromptsLoadingView } from './AiPromptsLoadingView'

describe('AiPromptsLoadingView', () => {
  it('renderiza WritingHandLoader', () => {
    renderWithI18n(<AiPromptsLoadingView requestedItems={3} onCancel={vi.fn()} />)

    expect(screen.getByTestId('writing-hand-loader')).toBeInTheDocument()
  })

  it('mantiene badge, título y botón cancelar (sin copy secundario ni panel)', () => {
    renderWithI18n(<AiPromptsLoadingView requestedItems={5} onCancel={vi.fn()} />)

    expect(screen.getByText(/Generando adivinanzas/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Preparando la partida AI/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument()
    expect(screen.queryByText(/Pedimos 5 adivinanzas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Mantenelo abierto/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('cancelar dispara onCancel', () => {
    const onCancel = vi.fn()
    renderWithI18n(<AiPromptsLoadingView requestedItems={2} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
