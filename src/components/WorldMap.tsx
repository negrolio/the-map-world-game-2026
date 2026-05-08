import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'

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

interface MapViewport {
  readonly zoom: number
  readonly offset: readonly [number, number]
}

const VIEWPORT_LIMITS = {
  zoom: {
    min: 1,
    max: 4,
    step: 0.35,
  },
  offset: {
    default: [0, 0] as const,
  },
} as const

function clampZoom(zoom: number): number {
  return Math.min(VIEWPORT_LIMITS.zoom.max, Math.max(VIEWPORT_LIMITS.zoom.min, zoom))
}

function wheelDeltaToZoomStep(deltaY: number): number {
  const direction = deltaY < 0 ? 1 : -1
  const magnitude = Math.min(Math.abs(deltaY), 120)
  const normalized = magnitude / 120
  const minStep = 0.08
  const maxStep = VIEWPORT_LIMITS.zoom.step
  return direction * (minStep + (maxStep - minStep) * normalized)
}

function applyZoomAroundPoint(
  current: MapViewport,
  nextZoom: number,
  anchor: { x: number; y: number },
): MapViewport {
  if (nextZoom === current.zoom) {
    return current
  }

  const zoomRatio = nextZoom / current.zoom
  const nextOffsetX = anchor.x - (anchor.x - current.offset[0]) * zoomRatio
  const nextOffsetY = anchor.y - (anchor.y - current.offset[1]) * zoomRatio

  return {
    zoom: nextZoom,
    offset: [nextOffsetX, nextOffsetY],
  }
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
  const defaultViewport = useMemo<MapViewport>(
    () => ({
      zoom: VIEWPORT_LIMITS.zoom.min,
      offset: VIEWPORT_LIMITS.offset.default,
    }),
    [],
  )
  const [viewport, setViewport] = useState<MapViewport>(defaultViewport)
  const [isDragging, setIsDragging] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const panStartRef = useRef<{
    readonly pointerX: number
    readonly pointerY: number
    readonly offsetX: number
    readonly offsetY: number
  } | null>(null)
  const draggedRef = useRef(false)
  const locked = answerLocked || Boolean(mapFeedback)
  const instructionsId = 'world-map-instructions'

  useEffect(() => {
    const viewportNode = viewportRef.current
    if (!viewportNode) {
      return
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const zoomDelta = wheelDeltaToZoomStep(event.deltaY)

      setViewport((current) => {
        const nextZoom = clampZoom(current.zoom + zoomDelta)

        const viewportRect = viewportNode.getBoundingClientRect()
        return applyZoomAroundPoint(current, nextZoom, {
          x: event.clientX - viewportRect.left,
          y: event.clientY - viewportRect.top,
        })
      })
    }

    viewportNode.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      viewportNode.removeEventListener('wheel', handleWheel)
    }
  }, [])
  return (
    <div
      data-testid="world-map-root"
      data-viewport-zoom={viewport.zoom.toFixed(2)}
      data-viewport-center={`${viewport.offset[0].toFixed(2)},${viewport.offset[1].toFixed(2)}`}
      role="region"
      aria-label="Mapa interactivo de países"
      aria-describedby={instructionsId}
      className={
        className ??
        'relative w-full max-w-4xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50'
      }
    >
      <p id={instructionsId} className="sr-only">
        Usá Tab para navegar países y Enter o Barra espaciadora para seleccionar.
      </p>
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          aria-label="Acercar mapa"
          className="rounded-md border border-slate-600 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          onClick={() => {
            const viewportRect = viewportRef.current?.getBoundingClientRect()
            const anchor = viewportRect
              ? { x: viewportRect.width / 2, y: viewportRect.height / 2 }
              : { x: 0, y: 0 }
            setViewport((current) =>
              applyZoomAroundPoint(
                current,
                clampZoom(current.zoom + VIEWPORT_LIMITS.zoom.step),
                anchor,
              ),
            )
          }}
        >
          Zoom +
        </button>
        <button
          type="button"
          aria-label="Alejar mapa"
          className="rounded-md border border-slate-600 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          onClick={() => {
            const viewportRect = viewportRef.current?.getBoundingClientRect()
            const anchor = viewportRect
              ? { x: viewportRect.width / 2, y: viewportRect.height / 2 }
              : { x: 0, y: 0 }
            setViewport((current) =>
              applyZoomAroundPoint(
                current,
                clampZoom(current.zoom - VIEWPORT_LIMITS.zoom.step),
                anchor,
              ),
            )
          }}
        >
          Zoom -
        </button>
        <button
          type="button"
          aria-label="Restablecer vista del mapa"
          className="rounded-md border border-slate-600 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          onClick={() => setViewport(defaultViewport)}
        >
          Reset
        </button>
      </div>
      <div
        ref={viewportRef}
        data-testid="world-map-viewport"
        className={
          isDragging
            ? 'max-h-[min(70vh,520px)] touch-none overflow-hidden overscroll-contain cursor-grabbing'
            : 'max-h-[min(70vh,520px)] touch-none overflow-hidden overscroll-contain cursor-grab'
        }
        onMouseDown={(event) => {
          panStartRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            offsetX: viewport.offset[0],
            offsetY: viewport.offset[1],
          }
          setIsDragging(true)
          draggedRef.current = false
        }}
        onMouseMove={(event) => {
          const panStart = panStartRef.current
          if (!panStart) {
            return
          }
          const deltaX = event.clientX - panStart.pointerX
          const deltaY = event.clientY - panStart.pointerY
          if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            draggedRef.current = true
          }
          setViewport((current) => ({
            ...current,
            offset: [panStart.offsetX + deltaX, panStart.offsetY + deltaY],
          }))
        }}
        onMouseUp={() => {
          panStartRef.current = null
          setIsDragging(false)
        }}
        onMouseLeave={() => {
          panStartRef.current = null
          setIsDragging(false)
        }}
      >
        <div
          className="flex h-auto w-full origin-top-left justify-center text-slate-100 transition-transform duration-150 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-[min(70vh,520px)]"
          style={{
            transform: `translate(${viewport.offset[0]}px, ${viewport.offset[1]}px) scale(${viewport.zoom})`,
          }}
        >
          <ComposableMap projectionConfig={{ scale: 147, center: [0, 0] }}>
          {/* Regla: con `locked` se bloquea responder país, pero pan/zoom siguen habilitados para explorar el mapa. */}
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
                    tabIndex={locked ? -1 : 0}
                    aria-disabled={locked}
                    aria-label={
                      typeof geo.properties?.name === 'string'
                        ? `Seleccionar ${geo.properties.name}`
                        : `Seleccionar país ${iso2Clean ?? 'sin código'}`
                    }
                    className={
                      locked
                        ? 'outline-none transition-[fill] duration-200'
                        : 'cursor-pointer outline-none transition-[fill] duration-150 focus-visible:ring-2 focus-visible:ring-cyan-400'
                    }
                    style={geoStyle}
                    onClick={(event: MouseEvent<SVGPathElement>) => {
                      event.stopPropagation()
                      if (draggedRef.current) {
                        draggedRef.current = false
                        return
                      }
                      if (locked) {
                        return
                      }
                      const resolved = resolveCountryClickFromTopologyProperties(geo.properties, geo.id)
                      onCountryClick?.(resolved)
                    }}
                    onKeyDown={(event: KeyboardEvent<SVGPathElement>) => {
                      if (locked) {
                        return
                      }
                      if (event.key !== 'Enter' && event.key !== ' ') {
                        return
                      }
                      event.preventDefault()
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
      </div>
    </div>
  )
}
