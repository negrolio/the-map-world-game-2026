import { afterEach, describe, expect, it, vi } from 'vitest'

import { logAppEvent } from './app-log'

describe('logAppEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registra errores con payload estructurado', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logAppEvent({
      event: 'test_event',
      level: 'error',
      message: 'failure',
      context: { code: 42, ok: false, label: null },
    })

    expect(spy).toHaveBeenCalledOnce()
    const payload = spy.mock.calls[0][1] as Record<string, unknown>
    expect(payload).toMatchObject({
      event: 'test_event',
      level: 'error',
      message: 'failure',
      context: { code: 42, ok: false, label: null },
    })
    expect(typeof payload.ts).toBe('string')
  })
})
