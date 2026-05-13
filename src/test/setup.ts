import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

/**
 * jsdom no implementa `matchMedia`; varios componentes lo consultan (p. ej. HUD responsive,
 * atajos de teclado en `GameShell`). Default conservador: ninguna media query matchea.
 */
function createMediaQueryListStub(matches: boolean, query: string): MediaQueryList {
  const noop = (): void => {}
  return {
    matches,
    media: query,
    onchange: null,
    addListener: noop,
    removeListener: noop,
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => false,
  } as unknown as MediaQueryList
}

if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => createMediaQueryListStub(false, query),
  })
}

afterEach(() => {
  cleanup()
})
