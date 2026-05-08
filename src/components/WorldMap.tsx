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
  /**
   * F2.2 — Cuando es `true`, el mapa se renderiza edge-to-edge dentro de su
   * contenedor padre (h-full / w-full) y descarta los límites visuales propios
   * del modo "tarjeta" (max-w-4xl, rounded-xl, border y max-h). Pensado para el
   * shell de partida a pantalla completa donde el mapa es la capa base.
   */
  readonly fullBleed?: boolean
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
 *
 * Nota: react-simple-maps declara peer React hasta 18; el proyecto usa React 19
 * con `npm install --legacy-peer-deps` hasta que el paquete actualice peers.
 *
 * F2.6 — Pan/zoom como válvula de escape de la UI:
 *  En el shell de partida a pantalla completa (App.tsx, MAP-UX-02), el overlay
 *  ocupa una banda superior y otra inferior sobre el mapa. Si un país objetivo
 *  queda parcialmente cubierto por esas bandas, el usuario debe poder
 *  *desplazar* (pan) o *acercar* (zoom) la vista usando los controles de zoom
 *  +/-/reset, la rueda del mouse, o arrastrando el mapa con el dedo / cursor.
 *  Esto está habilitado siempre, incluso con `answerLocked` (post-respuesta),
 *  porque pan/zoom no responden la pregunta: solo modifican la vista.
 */
export function WorldMap({
  className,
  onCountryClick,
  mapFeedback = null,
  answerLocked = false,
  fullBleed = false,
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

  const baseContainerClass = fullBleed
    ? 'relative h-full w-full overflow-hidden bg-slate-900/40'
    : 'relative w-full max-w-4xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50'
  const containerClass = className ?? baseContainerClass

  const baseViewportClass = fullBleed
    ? 'h-full w-full touch-none overflow-hidden overscroll-contain'
    : 'max-h-[min(70vh,520px)] touch-none overflow-hidden overscroll-contain'
  const viewportClass = `${baseViewportClass} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`

  const svgWrapperClass = fullBleed
    ? 'flex h-full w-full origin-top-left items-center justify-center text-slate-100 transition-transform duration-150 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-full [&_svg]:w-full'
    : 'flex h-auto w-full origin-top-left justify-center text-slate-100 transition-transform duration-150 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-[min(70vh,520px)]'

  return (
    <div
      data-testid="world-map-root"
      data-viewport-zoom={viewport.zoom.toFixed(2)}
      data-viewport-center={`${viewport.offset[0].toFixed(2)},${viewport.offset[1].toFixed(2)}`}
      data-fullbleed={fullBleed ? 'true' : undefined}
      role="region"
      aria-label="Mapa interactivo de países"
      aria-describedby={instructionsId}
      className={containerClass}
    >
      <p id={instructionsId} className="sr-only">
        Usá Tab para navegar países y Enter o Barra espaciadora para seleccionar.
        Si la interfaz superpone parte del mapa, podés acercar, alejar y mover la
        vista con los controles del mapa o con la rueda del mouse hasta exponer el
        país que querés tocar.
      </p>
      {/*
        F2.5 — Zoom +/-/Reset.
        - En modo `fullBleed` (partida pantalla completa) los controles se apilan
          verticalmente en el borde derecho, centrados verticalmente, para no chocar
          con la banda superior (Setup/Home) ni la banda inferior (HUD + Siguiente)
          del overlay (App.tsx). No hay duplicación con el overlay: estos botones
          son la única superficie de zoom en la UI.
        - En modo "tarjeta" (no fullBleed) se mantienen agrupados arriba a la derecha
          como antes, comportamiento usado por WorldMap.test.tsx y otras vistas.
      */}
      <div
        data-testid="world-map-controls"
        className={
          fullBleed
            ? 'pointer-events-auto absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2'
            : 'absolute right-3 top-3 z-10 flex gap-2'
        }
      >
        <button
          type="button"
          aria-label="Acercar mapa"
          className="rounded-md border border-slate-600 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-md transition-colors hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
          className="rounded-md border border-slate-600 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-md transition-colors hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
          className="rounded-md border border-slate-600 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-100 shadow-md transition-colors hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          onClick={() => setViewport(defaultViewport)}
        >
          Reset
        </button>
      </div>
      <div
        ref={viewportRef}
        data-testid="world-map-viewport"
        className={viewportClass}
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
          className={svgWrapperClass}
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
