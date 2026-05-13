import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { GeographyRenderObject } from 'react-simple-maps'
import {
  memo,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type {
  KeyboardEvent,
  MouseEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
} from 'react'

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
    /** Ratón / ventana “escritorio” (sin heurística táctil). */
    max: 4,
    /**
     * Tope alto cuando la UI es táctil o el viewport es estrecho (móvil, tablet,
     * landscape ancho con dedo): países 110m quedan muy chicos sin mucho zoom.
     */
    maxTouchUi: 22,
    step: 0.35,
    /** Paso mayor en Zoom +/− cuando aplica `maxTouchUi` (menos toques hasta el tope). */
    stepTouchUi: 0.6,
  },
  offset: {
    default: [0, 0] as const,
  },
} as const

/** Tailwind `lg` (1024px): tablets en vertical y muchos móviles en horizontal. */
const TOUCH_UI_MAX_WIDTH_MEDIA_QUERY = '(max-width: 1023px)'
/** Tablets / teléfonos aunque el viewport CSS sea ancho (p. ej. iPad landscape). */
const TOUCH_UI_POINTER_COARSE_MEDIA_QUERY = '(pointer: coarse)'

function subscribeTouchUiZoomMatch(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mqWidth = window.matchMedia(TOUCH_UI_MAX_WIDTH_MEDIA_QUERY)
  const mqCoarse = window.matchMedia(TOUCH_UI_POINTER_COARSE_MEDIA_QUERY)
  mqWidth.addEventListener('change', onChange)
  mqCoarse.addEventListener('change', onChange)
  return () => {
    mqWidth.removeEventListener('change', onChange)
    mqCoarse.removeEventListener('change', onChange)
  }
}

function getTouchUiZoomSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return (
    window.matchMedia(TOUCH_UI_MAX_WIDTH_MEDIA_QUERY).matches ||
    window.matchMedia(TOUCH_UI_POINTER_COARSE_MEDIA_QUERY).matches
  )
}

function clampZoomToMax(zoom: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(VIEWPORT_LIMITS.zoom.min, zoom))
}

function wheelDeltaToZoomStep(deltaY: number, stepCap: number = VIEWPORT_LIMITS.zoom.step): number {
  const direction = deltaY < 0 ? 1 : -1
  const magnitude = Math.min(Math.abs(deltaY), 120)
  const normalized = magnitude / 120
  const minStep = stepCap >= VIEWPORT_LIMITS.zoom.stepTouchUi ? 0.12 : 0.08
  const maxStep = stepCap
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

const MIN_PINCH_SEPARATION_PX = 1e-3

type ClientPoint = { readonly clientX: number; readonly clientY: number }

function euclideanDistance(a: ClientPoint, b: ClientPoint): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function midpointClient(a: ClientPoint, b: ClientPoint): { readonly x: number; readonly y: number } {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  }
}

function clientMidToViewportLocal(
  rect: DOMRect,
  midClient: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  return { x: midClient.x - rect.left, y: midClient.y - rect.top }
}

function trySetPointerCapture(node: HTMLDivElement, pointerId: number): void {
  try {
    node.setPointerCapture(pointerId)
  } catch {
    // Nodo desconectado o puntero no elegible para captura.
  }
}

function tryReleasePointerCapture(node: HTMLDivElement, pointerId: number): void {
  try {
    if (node.hasPointerCapture(pointerId)) {
      node.releasePointerCapture(pointerId)
    }
  } catch {
    // Liberación redundante o puntero ya invalidado.
  }
}

/** `translate3d` para composición GPU; mismo formato en layout effect y en actualizaciones imperativas. */
function mapViewportToTransformCss(v: MapViewport): string {
  return `translate3d(${v.offset[0]}px, ${v.offset[1]}px, 0) scale(${v.zoom})`
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
      /**
       * MAP-UX — ratón / lápiz: el viewport usa `setPointerCapture` para pan.
       * Si el `pointerdown` burbujea hasta ahí, el `pointerup` va al contenedor y
       * el navegador no compone `click` sobre el path (el táctil suele seguir
       * funcionando). Cortamos la burbuja solo con selección activa (`!locked`).
       */
      onPointerDown={(event: ReactPointerEvent<SVGPathElement>) => {
        if (locked) {
          return
        }
        if (event.pointerType === 'touch') {
          return
        }
        event.stopPropagation()
      }}
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
 *  +/-/reset, la rueda del mouse, o arrastrando el mapa con el dedo / cursor
 *  (Pointer Events: un dedo pan, dos dedos pellizco).
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
  const transformLayerRef = useRef<HTMLDivElement | null>(null)
  /** Último pan/zoom aplicado al DOM; se alinea con `viewport` en layout effect y tras gestos. */
  const viewportLiveRef = useRef<MapViewport | null>(null)
  const wheelFlushRafRef = useRef<number | null>(null)
  const panStartRef = useRef<{
    readonly pointerX: number
    readonly pointerY: number
    readonly offsetX: number
    readonly offsetY: number
  } | null>(null)
  const draggedRef = useRef(false)
  /** MAP-UX-06 — punteros activos en el viewport (touch/mouse/pen). */
  const activePointersRef = useRef(new Map<number, { clientX: number; clientY: number }>())
  /** Separación entre los dos dedos en el último frame de pinch (ratio incremental). */
  const pinchLastDistanceRef = useRef<number | null>(null)
  const locked = answerLocked || Boolean(mapFeedback)
  const instructionsId = 'world-map-instructions'

  const touchUiZoom = useSyncExternalStore(
    subscribeTouchUiZoomMatch,
    getTouchUiZoomSnapshot,
    () => false,
  )
  const zoomClampMax = touchUiZoom ? VIEWPORT_LIMITS.zoom.maxTouchUi : VIEWPORT_LIMITS.zoom.max
  const zoomStepButtons = touchUiZoom ? VIEWPORT_LIMITS.zoom.stepTouchUi : VIEWPORT_LIMITS.zoom.step
  const zoomClampMaxRef = useRef<number>(VIEWPORT_LIMITS.zoom.max)
  const touchUiZoomRef = useRef(false)
  useInsertionEffect(() => {
    zoomClampMaxRef.current = zoomClampMax
    touchUiZoomRef.current = touchUiZoom
  }, [zoomClampMax, touchUiZoom])

  useLayoutEffect(() => {
    // Al pasar de UI táctil a escritorio (u orientación) hay que bajar el zoom si superaba el máximo de escritorio.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el tope viene de `matchMedia`, no de props React
    setViewport((v) => {
      const z = clampZoomToMax(v.zoom, zoomClampMax)
      return z === v.zoom ? v : { ...v, zoom: z }
    })
    const live = viewportLiveRef.current
    if (live) {
      const z = clampZoomToMax(live.zoom, zoomClampMax)
      if (z !== live.zoom) {
        viewportLiveRef.current = { ...live, zoom: z }
      }
    }
  }, [zoomClampMax])

  useLayoutEffect(() => {
    viewportLiveRef.current = viewport
    const layer = transformLayerRef.current
    if (layer) {
      layer.style.transform = mapViewportToTransformCss(viewport)
    }
  }, [viewport])

  useEffect(() => {
    const viewportNode = viewportRef.current
    if (!viewportNode) {
      return
    }

    let cancelled = false

    const flushWheelToReact = (): void => {
      wheelFlushRafRef.current = null
      if (cancelled) {
        return
      }
      const live = viewportLiveRef.current
      if (live) {
        setViewport(live)
      }
    }

    const handleWheel = (event: WheelEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      const zoomDelta = wheelDeltaToZoomStep(
        event.deltaY,
        touchUiZoomRef.current ? VIEWPORT_LIMITS.zoom.stepTouchUi : VIEWPORT_LIMITS.zoom.step,
      )

      const current = viewportLiveRef.current
      if (!current) {
        return
      }

      const nextZoom = clampZoomToMax(current.zoom + zoomDelta, zoomClampMaxRef.current)
      const viewportRect = viewportNode.getBoundingClientRect()
      const next = applyZoomAroundPoint(current, nextZoom, {
        x: event.clientX - viewportRect.left,
        y: event.clientY - viewportRect.top,
      })
      viewportLiveRef.current = next

      const layer = transformLayerRef.current
      if (layer) {
        layer.style.transform = mapViewportToTransformCss(next)
      }

      if (wheelFlushRafRef.current == null) {
        wheelFlushRafRef.current = requestAnimationFrame(flushWheelToReact)
      }
    }

    viewportNode.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      cancelled = true
      if (wheelFlushRafRef.current != null) {
        cancelAnimationFrame(wheelFlushRafRef.current)
        wheelFlushRafRef.current = null
      }
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

  /**
   * Sin `transition-transform` en esta capa: el pan/zoom actualiza `transform` en
   * cada evento de puntero; una transición CSS retrasa el mapa respecto del cursor
   * y da sensación de “lag” o aceleración al final del gesto.
   */
  const svgWrapperClass = fullBleed
    ? 'flex h-full w-full origin-top-left items-center justify-center text-wood-dark [&_svg]:mx-auto [&_svg]:block [&_svg]:h-full [&_svg]:w-full'
    : 'flex h-auto w-full origin-top-left justify-center text-wood-dark [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-[min(70vh,520px)]'

  const finalizePointerEnd = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const node = viewportRef.current
    if (node) {
      tryReleasePointerCapture(node, event.pointerId)
    }
    if (!activePointersRef.current.has(event.pointerId)) {
      return
    }
    activePointersRef.current.delete(event.pointerId)
    const remaining = activePointersRef.current.size

    if (remaining === 0) {
      const live = viewportLiveRef.current
      if (live) {
        setViewport(live)
      }
      panStartRef.current = null
      pinchLastDistanceRef.current = null
      setIsDragging(false)
      return
    }

    if (remaining === 1) {
      pinchLastDistanceRef.current = null
      const live = viewportLiveRef.current
      const pts = [...activePointersRef.current.values()]
      const pt = pts[0]
      if (live && pt) {
        setViewport(live)
        viewportLiveRef.current = {
          zoom: live.zoom,
          offset: [live.offset[0], live.offset[1]],
        }
        panStartRef.current = {
          pointerX: pt.clientX,
          pointerY: pt.clientY,
          offsetX: live.offset[0],
          offsetY: live.offset[1],
        }
      }
      setIsDragging(true)
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }
    const node = viewportRef.current
    if (!node) {
      return
    }
    trySetPointerCapture(node, event.pointerId)

    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })

    const count = activePointersRef.current.size

    if (count === 2) {
      panStartRef.current = null
      const positions = [...activePointersRef.current.values()]
      if (positions.length === 2) {
        const d = Math.max(euclideanDistance(positions[0], positions[1]), MIN_PINCH_SEPARATION_PX)
        pinchLastDistanceRef.current = d
        draggedRef.current = true
      }
      setIsDragging(true)
      return
    }

    if (count === 1) {
      pinchLastDistanceRef.current = null
      const base = viewportLiveRef.current ?? viewport
      viewportLiveRef.current = {
        zoom: base.zoom,
        offset: [base.offset[0], base.offset[1]],
      }
      panStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        offsetX: base.offset[0],
        offsetY: base.offset[1],
      }
      setIsDragging(true)
      draggedRef.current = false
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!activePointersRef.current.has(event.pointerId)) {
      return
    }
    activePointersRef.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    })

    const node = viewportRef.current
    if (!node) {
      return
    }

    const count = activePointersRef.current.size

    if (count === 2) {
      const positions = [...activePointersRef.current.values()]
      if (positions.length !== 2) {
        return
      }
      const d = Math.max(euclideanDistance(positions[0], positions[1]), MIN_PINCH_SEPARATION_PX)
      const prev = viewportLiveRef.current
      if (!prev) {
        return
      }
      if (pinchLastDistanceRef.current == null) {
        pinchLastDistanceRef.current = d
        return
      }
      const rect = node.getBoundingClientRect()
      const midClient = midpointClient(positions[0], positions[1])
      const anchor = clientMidToViewportLocal(rect, midClient)
      const ratio = d / pinchLastDistanceRef.current
      const nextZoom = clampZoomToMax(prev.zoom * ratio, zoomClampMaxRef.current)
      const next = applyZoomAroundPoint(prev, nextZoom, anchor)
      pinchLastDistanceRef.current = d
      viewportLiveRef.current = next
      draggedRef.current = true
      const layer = transformLayerRef.current
      if (layer) {
        layer.style.transform = mapViewportToTransformCss(next)
      }
      return
    }

    if (count === 1 && panStartRef.current) {
      const panStart = panStartRef.current
      const deltaX = event.clientX - panStart.pointerX
      const deltaY = event.clientY - panStart.pointerY
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        draggedRef.current = true
      }
      const live = viewportLiveRef.current
      const zoom = live?.zoom ?? viewport.zoom
      const next: MapViewport = {
        zoom,
        offset: [panStart.offsetX + deltaX, panStart.offsetY + deltaY],
      }
      viewportLiveRef.current = next
      const layer = transformLayerRef.current
      if (layer) {
        layer.style.transform = mapViewportToTransformCss(next)
      }
    }
  }

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
        vista con los controles del mapa, la rueda del mouse, arrastrando con el
        cursor o, en pantallas táctiles, con un dedo para mover y dos para pellizcar
        y hacer zoom hasta exponer el país que querés tocar. En táctil o pantallas
        chicas podés acercar mucho más que con ratón para tocar países pequeños.
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
                clampZoomToMax(current.zoom + zoomStepButtons, zoomClampMax),
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
                clampZoomToMax(current.zoom - zoomStepButtons, zoomClampMax),
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finalizePointerEnd}
        onPointerCancel={finalizePointerEnd}
      >
        <div
          ref={transformLayerRef}
          data-testid="world-map-transform-layer"
          className={svgWrapperClass}
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
