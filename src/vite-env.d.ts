/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'world-atlas/countries-110m.json?url' {
  const url: string
  export default url
}

declare module 'world-atlas/countries-110m.json' {
  const topology: {
    objects: {
      countries: {
        geometries: Array<{
          id?: string | number
          properties?: Record<string, unknown>
        }>
      }
    }
  }
  export default topology
}

declare module 'topojson-client' {
  export function neighbors(
    objects: Array<{ id?: string | number; properties?: Record<string, unknown> }>,
  ): number[][]
}
