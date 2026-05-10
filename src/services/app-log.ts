export type AppLogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Contexto estructurado sin PII: códigos, flags y datos técnicos.
 * No incluir nombres de jugadores, inputs de formulario ni identificadores personales.
 */
export type AppLogContextValue = string | number | boolean | null

export type AppLogPayload = {
  readonly event: string
  readonly level: AppLogLevel
  readonly message: string
  readonly context?: Readonly<Record<string, AppLogContextValue>>
}

/**
 * Registro mínimo para observabilidad (RNF-05/06). Errores siempre a consola;
 * otros niveles solo en desarrollo para no ruido en producción.
 */
export function logAppEvent(payload: AppLogPayload): void {
  const entry = {
    ...payload,
    ts: new Date().toISOString(),
  }

  switch (payload.level) {
    case 'error':
      console.error('[app]', entry)
      return
    case 'warn':
      if (import.meta.env.DEV) {
        console.warn('[app]', entry)
      }
      return
    default:
      if (import.meta.env.DEV) {
        console.debug('[app]', entry)
      }
  }
}
