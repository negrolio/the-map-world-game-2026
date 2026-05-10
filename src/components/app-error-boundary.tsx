import { Component, type ErrorInfo, type ReactNode } from 'react'

import { logAppEvent } from '../services/app-log'

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
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
          <h1 className="mb-2 text-xl font-semibold">Algo salió mal</h1>
          <p className="mb-6 max-w-md text-sm text-slate-300">
            La aplicación encontró un error inesperado. Podés recargar la página para volver a
            intentar.
          </p>
          <button
            type="button"
            className="rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:border-cyan-400 hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            onClick={() => {
              window.location.reload()
            }}
          >
            Recargar página
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
