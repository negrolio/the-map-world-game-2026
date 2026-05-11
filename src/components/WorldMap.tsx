import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { GeographyRenderObject } from 'react-simple-maps'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, MutableRefObject } from 'react'

import countriesTopologyUrl from 'world-atlas/countries-110m.json?url'
import { getContinentForIso2 } from '../data/countries'
import { resolveCountryClickFromTopologyProperties } from '../services/topology-country-click'
import type { IsoCountryCode, RegionFilter } from '../types'

import { ChunkyButton } from './ui'
import {
  getBaselineViewportForRegion,
  getProjectionConfigForRegion,
  type WorldMapBaselineViewport,
} from './world-map-baseline-viewport'
import {
  MAP_ACTIVE_CONTINENT_PALETTE,
  MAP_CORRECT_TARGET_PALETTE,
  MAP_DEFAULT_PALETTE,
  MAP_OUT_OF_REGION_PALETTE,
  MAP_REVEALED_TARGET_PALETTE,
  MAP_WRONG_SELECTION_PALETTE,
} from './world-map-palette'

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
  /** MAP-UX-05: filtro de región activo para atenuar el resto del mundo (no afecta `world`). */
  readonly regionFilter?: RegionFilter
}

type MapViewport = WorldMapBaselineViewport

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

type GeographyCssStyle = {
  readonly default: { readonly fill: string; readonly stroke: string; readonly strokeWidth: number; readonly outline: 'none' }
  readonly hover: { readonly fill: string; readonly stroke: string; readonly strokeWidth: number; readonly outline: 'none' }
  readonly pressed: { readonly fill: string; readonly outline: 'none' }
}

function toGeographyStyle(
  palette: {
    readonly default: { readonly fill: string; readonly stroke: string; readonly strokeWidth: number }
    readonly hover: { readonly fill: string; readonly stroke: string; readonly strokeWidth: number }
    readonly pressed: { readonly fill: string }
  },
  interactionLocked: boolean,
): GeographyCssStyle {
  const hover = interactionLocked ? palette.default : palette.hover
  return {
    default: { ...palette.default, outline: 'none' },
    hover: { ...hover, outline: 'none' },
    pressed: { ...palette.pressed, outline: 'none' },
  }
}

/** MAP-UX-05 / F5.4: el feedback de ronda gana al dimming regional; `interactionLocked` congela hover fuera del feedback. */
function geographyStyleForIso(
  iso2: string | undefined,
  mapFeedback: MapAnswerFeedback | null | undefined,
  interactionLocked: boolean,
  regionFilter: RegionFilter,
): GeographyCssStyle {
  if (iso2 && mapFeedback) {
    const { selectedIso2, targetIso2, isCorrect } = mapFeedback

    if (isCorrect && iso2 === targetIso2) {
      return toGeographyStyle(MAP_CORRECT_TARGET_PALETTE, interactionLocked)
    }

    if (!isCorrect) {
      if (iso2 === selectedIso2) {
        return toGeographyStyle(MAP_WRONG_SELECTION_PALETTE, interactionLocked)
      }
      if (iso2 === targetIso2) {
        return toGeographyStyle(MAP_REVEALED_TARGET_PALETTE, interactionLocked)
      }
    }
  }

  if (regionFilter !== 'world') {
    const continent = getContinentForIso2(iso2)
    if (!continent || continent !== regionFilter) {
      return toGeographyStyle(MAP_OUT_OF_REGION_PALETTE, interactionLocked)
    }
    return toGeographyStyle(MAP_ACTIVE_CONTINENT_PALETTE, interactionLocked)
  }

  return toGeographyStyle(MAP_DEFAULT_PALETTE, interactionLocked)
}

type WorldMapGeographyRowProps = {
  readonly geo: GeographyRenderObject
  readonly iso2: string | undefined
  readonly mapFeedback: MapAnswerFeedback | null
  readonly locked: boolean
  readonly regionFilter: RegionFilter
  readonly onCountryClick?: (iso2: IsoCountryCode | null) => void
  readonly draggedRef: MutableRefObject<boolean>
}

function mapFeedbackShallowEqual(a: MapAnswerFeedback | null, b: MapAnswerFeedback | null): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return (
    a.selectedIso2 === b.selectedIso2 &&
    a.targetIso2 === b.targetIso2 &&
    a.isCorrect === b.isCorrect
  )
}

function worldMapGeographyRowPropsEqual(
  prev: Readonly<WorldMapGeographyRowProps>,
  next: Readonly<WorldMapGeographyRowProps>,
): boolean {
  return (
    prev.geo.rsmKey === next.geo.rsmKey &&
    prev.iso2 === next.iso2 &&
    prev.locked === next.locked &&
    prev.regionFilter === next.regionFilter &&
    prev.onCountryClick === next.onCountryClick &&
    prev.draggedRef === next.draggedRef &&
    mapFeedbackShallowEqual(prev.mapFeedback, next.mapFeedback)
  )
}

/** F7.3 — evita re-render de ~200 paths cuando el overlay (HUD/texto) actualiza sin cambiar feedback del mapa. */
const WorldMapGeographyRow = memo(function WorldMapGeographyRow({
  geo,
  iso2,
  mapFeedback,
  locked,
  regionFilter,
  onCountryClick,
  draggedRef,
}: WorldMapGeographyRowProps) {
  const geoStyle = geographyStyleForIso(iso2, mapFeedback, locked, regionFilter)
  const ariaLabel =
    typeof geo.properties.name === 'string'
      ? `Seleccionar ${geo.properties.name}`
      : `Seleccionar país ${iso2 ?? 'sin código'}`

  return (
    <Geography
      geography={geo}
      data-iso={iso2}
      tabIndex={locked ? -1 : 0}
      aria-disabled={locked}
      aria-label={ariaLabel}
      className={
        locked
          ? 'outline-none transition-[fill] duration-200'
          : 'cursor-pointer outline-none transition-[fill] duration-150 focus-visible:ring-2 focus-visible:ring-warning'
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
}, worldMapGeographyRowPropsEqual)

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
function WorldMapInner({
  className,
  onCountryClick,
  mapFeedback = null,
  answerLocked = false,
  fullBleed = false,
  regionFilter = 'world',
}: WorldMapProps) {
  const projectionConfig = useMemo(() => {
    const c = getProjectionConfigForRegion(regionFilter)
    return { scale: c.scale, center: [c.center[0], c.center[1]] as [number, number] }
  }, [regionFilter])

  const [viewport, setViewport] = useState<MapViewport>(() => getBaselineViewportForRegion(regionFilter))
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
    ? 'relative h-full w-full overflow-hidden bg-info/10'
    : 'relative w-full max-w-4xl overflow-hidden rounded-panel border-2 border-wood-dark/50 bg-info/10 shadow-chunky-sm'
  const containerClass = className ?? baseContainerClass

  const baseViewportClass = fullBleed
    ? 'h-full w-full touch-none overflow-hidden overscroll-contain'
    : 'max-h-[min(70vh,520px)] touch-none overflow-hidden overscroll-contain'
  const viewportClass = `${baseViewportClass} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`

  const svgWrapperClass = fullBleed
    ? 'flex h-full w-full origin-top-left items-center justify-center text-wood-dark transition-transform duration-150 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-full [&_svg]:w-full'
    : 'flex h-auto w-full origin-top-left justify-center text-wood-dark transition-transform duration-150 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-[min(70vh,520px)]'

  return (
    <div
      data-testid="world-map-root"
      data-viewport-zoom={viewport.zoom.toFixed(2)}
      data-viewport-center={`${viewport.offset[0].toFixed(2)},${viewport.offset[1].toFixed(2)}`}
      data-fullbleed={fullBleed ? 'true' : undefined}
      data-region-filter={regionFilter}
      data-map-projection-scale={String(projectionConfig.scale)}
      data-map-projection-center={`${projectionConfig.center[0]},${projectionConfig.center[1]}`}
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
        <ChunkyButton
          type="button"
          tone="secondary"
          size="sm"
          aria-label="Acercar mapa"
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
        </ChunkyButton>
        <ChunkyButton
          type="button"
          tone="secondary"
          size="sm"
          aria-label="Alejar mapa"
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
        </ChunkyButton>
        <ChunkyButton
          type="button"
          tone="secondary"
          size="sm"
          aria-label="Restablecer vista del mapa"
          onClick={() => setViewport(getBaselineViewportForRegion(regionFilter))}
        >
          Reset
        </ChunkyButton>
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
          <ComposableMap projectionConfig={projectionConfig}>
          {/* Regla: con `locked` se bloquea responder país, pero pan/zoom siguen habilitados para explorar el mapa. */}
          <Geographies geography={countriesTopologyUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso2Clean =
                  resolveCountryClickFromTopologyProperties(geo.properties, geo.id) ?? undefined

                return (
                  <WorldMapGeographyRow
                    key={geo.rsmKey}
                    geo={geo}
                    iso2={iso2Clean}
                    mapFeedback={mapFeedback}
                    locked={locked}
                    regionFilter={regionFilter}
                    onCountryClick={onCountryClick}
                    draggedRef={draggedRef}
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

/**
 * MAP-UX-05: al cambiar `regionFilter` se remonta el estado de pan/zoom para que
 * la vista CSS vuelva al “home” mientras la proyección encuadra el continente.
 */
export function WorldMap(props: WorldMapProps) {
  const regionFilter = props.regionFilter ?? 'world'
  return <WorldMapInner key={regionFilter} {...props} regionFilter={regionFilter} />
}
