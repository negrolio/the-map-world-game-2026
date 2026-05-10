import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const logAppEventMock = vi.hoisted(() => vi.fn())

vi.mock('../services/app-log', () => ({
  logAppEvent: logAppEventMock,
}))

import { AppErrorBoundary } from './app-error-boundary'

function ThrowingChild(): never {
  throw new Error('unit-test-boundary')
}

describe('AppErrorBoundary', () => {
  afterEach(() => {
    logAppEventMock.mockClear()
    vi.restoreAllMocks()
  })

  it('muestra UI de fallo cuando un hijo lanza en render', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <AppErrorBoundary>
        <ThrowingChild />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: /algo salió mal/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /recargar página/i })).toBeInTheDocument()
    expect(logAppEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'react_render_error',
        level: 'error',
      }),
    )

    consoleSpy.mockRestore()
  })
})
