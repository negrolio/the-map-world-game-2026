import { Component, type ErrorInfo, type ReactNode } from 'react'

import { logAppEvent } from '../services/app-log'
import { ChunkyButton, Panel } from './ui'

type AppErrorBoundaryProps = {
  readonly children: ReactNode
}

type AppErrorBoundaryState = {
  readonly hasError: boolean
}

const COMPONENT_STACK_MAX = 2000

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const isDev = import.meta.env.DEV
    logAppEvent({
      event: 'react_render_error',
      level: 'error',
      message: isDev ? error.message : 'React render failure',
      context: {
        errorName: error.name,
        ...(isDev
          ? {
              componentStackPreview: errorInfo.componentStack?.slice(0, COMPONENT_STACK_MAX) ?? '',
            }
          : {}),
      },
    })
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-ink">
          <Panel tone="paper" padding="lg" className="w-full max-w-md">
            <h1 className="mb-2 font-display text-2xl uppercase tracking-tight text-wood-dark">
              Algo salió mal
            </h1>
            <p className="mb-6 max-w-md font-body text-sm text-ink-soft">
              La aplicación encontró un error inesperado. Podés recargar la página para volver a
              intentar.
            </p>
            <ChunkyButton
              type="button"
              tone="primary"
              onClick={() => {
                window.location.reload()
              }}
            >
              Recargar página
            </ChunkyButton>
          </Panel>
        </main>
      )
    }

    return this.props.children
  }
}
