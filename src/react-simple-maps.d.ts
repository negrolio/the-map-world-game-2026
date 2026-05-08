declare module 'react-simple-maps' {
  import type { CSSProperties, ReactNode, SVGProps } from 'react'

  export interface ComposableMapProps {
    readonly projectionConfig?: { readonly scale?: number; readonly center?: readonly [number, number] }
    readonly className?: string
    readonly children?: ReactNode
  }

  export interface GeographyRenderObject {
    readonly rsmKey: string
    /** world-atlas: ISO 3166-1 numeric como en TopoJSON (`feature.id`). */
    readonly id?: string | number
    readonly properties: Record<string, unknown>
  }

  export interface GeographiesProps {
    readonly geography: string
    readonly children: (args: { readonly geographies: readonly GeographyRenderObject[] }) => ReactNode
  }

  export interface GeographyProps extends SVGProps<SVGPathElement> {
    readonly geography: GeographyRenderObject
    readonly style?: {
      readonly default?: CSSProperties
      readonly hover?: CSSProperties
      readonly pressed?: CSSProperties
    }
    readonly 'data-iso'?: string
  }

  export function ComposableMap(props: ComposableMapProps): ReactNode
  export function Geographies(props: GeographiesProps): ReactNode
  export function Geography(props: GeographyProps): ReactNode
}
