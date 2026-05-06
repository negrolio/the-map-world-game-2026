import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

import countriesTopologyUrl from 'world-atlas/countries-110m.json?url'
import { resolveCountryClickFromTopologyProperties } from '../services/topology-country-click'
import type { IsoCountryCode } from '../types'

export interface MapAnswerFeedback {
  readonly selectedIso2: IsoCountryCode
  readonly targetIso2: IsoCountryCode
  readonly isCorrect: boolean
}

export interface WorldMapProps {
  readonly className?: string
  readonly onCountryClick?: (iso2: IsoCountryCode | null) => void
  /** País elegido vs objetivo: colorea el mapa tras responder (F3.4). */
  readonly mapFeedback?: MapAnswerFeedback | null
  /** Mientras hay feedback de ronda, se bloquea el clic y el cursor. */
  readonly answerLocked?: boolean
}

const defaultStyle = {
  default: { fill: '#334155', stroke: '#1e293b', strokeWidth: 0.4, outline: 'none' as const },
  hover: { fill: '#475569', stroke: '#0f172a', strokeWidth: 0.4, outline: 'none' as const },
  pressed: { fill: '#64748b', outline: 'none' as const },
}

function geographyStyleForIso(
  iso2: string | undefined,
  mapFeedback: MapAnswerFeedback | null | undefined,
  answerLocked: boolean,
): typeof defaultStyle {
  if (!iso2 || !mapFeedback) {
    return {
      ...defaultStyle,
      hover: answerLocked ? defaultStyle.default : defaultStyle.hover,
    }
  }

  const { selectedIso2, targetIso2, isCorrect } = mapFeedback

  if (isCorrect && iso2 === targetIso2) {
    return {
      default: { fill: '#059669', stroke: '#064e3b', strokeWidth: 0.65, outline: 'none' },
      hover: { fill: '#10b981', stroke: '#064e3b', strokeWidth: 0.65, outline: 'none' },
      pressed: defaultStyle.pressed,
    }
  }

  if (!isCorrect) {
    if (iso2 === selectedIso2) {
      return {
        default: { fill: '#be123c', stroke: '#881337', strokeWidth: 0.65, outline: 'none' },
        hover: { fill: '#e11d48', stroke: '#881337', strokeWidth: 0.65, outline: 'none' },
        pressed: defaultStyle.pressed,
      }
    }
    if (iso2 === targetIso2) {
      return {
        default: { fill: '#d97706', stroke: '#92400e', strokeWidth: 0.65, outline: 'none' },
        hover: { fill: '#f59e0b', stroke: '#92400e', strokeWidth: 0.65, outline: 'none' },
        pressed: defaultStyle.pressed,
      }
    }
  }

  return {
    ...defaultStyle,
    hover: answerLocked ? defaultStyle.default : defaultStyle.hover,
  }
}

/**
 * Mapa mundial 110m (Natural Earth vía world-atlas) con react-simple-maps.
 * Nota: react-simple-maps declara peer React hasta 18; el proyecto usa React 19
 * con `npm install --legacy-peer-deps` hasta que el paquete actualice peers.
 */
export function WorldMap({
  className,
  onCountryClick,
  mapFeedback = null,
  answerLocked = false,
}: WorldMapProps) {
  const locked = answerLocked || Boolean(mapFeedback)

  return (
    <div
      data-testid="world-map-root"
      className={className ?? 'w-full max-w-4xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50'}
    >
      <ComposableMap
        projectionConfig={{ scale: 147, center: [0, 20] }}
        className="h-auto w-full text-slate-100 [&_svg]:block [&_svg]:max-h-[min(70vh,520px)]"
      >
        <Geographies geography={countriesTopologyUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const iso2Clean =
                resolveCountryClickFromTopologyProperties(geo.properties, geo.id) ?? undefined
              const geoStyle = geographyStyleForIso(iso2Clean, mapFeedback, locked)

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  data-iso={iso2Clean}
                  tabIndex={-1}
                  className={
                    locked
                      ? 'outline-none transition-[fill] duration-200'
                      : 'cursor-pointer outline-none transition-[fill] duration-150 focus-visible:ring-2 focus-visible:ring-cyan-400'
                  }
                  style={geoStyle}
                  onClick={(event) => {
                    event.stopPropagation()
                    if (locked) {
                      return
                    }
                    const resolved = resolveCountryClickFromTopologyProperties(geo.properties, geo.id)
                    onCountryClick?.(resolved)
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  )
}
