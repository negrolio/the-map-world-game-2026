import parchmentUrl from './assets/parchment.png'
import quillUrl from './assets/quill.jpg'
import { cn } from '../ui/cn'

export interface WritingHandLoaderProps {
  readonly className?: string
}

const LOADER_STYLE_ID = 'writing-hand-loader-keyframes'

/**
 * Loader del modo AI: pergamino con trazos cursivos titilantes mientras una
 * pluma se desplaza imitando que escribe (PRD UX feedback modo AI §4.5).
 *
 * - Pergamino: PNG RGBA con transparencia nativa → se renderiza directo sin
 *   procesar el fondo.
 * - Pluma: JPEG con fondo negro → se elimina con `feColorMatrix` mapeando
 *   luminancia a alpha + `feComponentTransfer` cuasi-step (slope=100,
 *   intercept=0). Cualquier píxel con luminancia ≥ 0.01 es totalmente opaco
 *   (los azules oscuros del cuerpo, la nib dorada y los bordes anti-aliased
 *   se preservan al 100 %); solo el negro puro cae a alpha 0.
 * - `overflow="visible"` en el `<svg>` para que la animación de la pluma
 *   pueda asomar fuera del `viewBox` cuando termina el renglón sin que el
 *   contenedor la recorte (la pluma siempre es la capa superior, jamás
 *   queda tapada por el pergamino).
 *
 * Composición de movimientos de la pluma (dos `<g>` anidados):
 * 1. Grupo exterior `.writing-hand-loader__quill` → `translate` recorriendo
 *    los tres renglones (gesto macro de "ir escribiendo línea por línea").
 * 2. Grupo interior `.writing-hand-loader__quill-rotate` → `rotate` oscilante
 *    con `transform-origin` fijado en la nib (110, 170) del viewBox y
 *    `transform-box: view-box` para que la coordenada del pivot sea estable
 *    entre navegadores. Simula el "punteo" vertical de la punta superior
 *    derecha mientras la nib permanece anclada sobre el renglón.
 *
 * Sin nuevas dependencias de procesamiento de imágenes (regla
 * `dependency-security.mdc`); animaciones CSS dentro de
 * `@media (prefers-reduced-motion: no-preference)` (RF-F54 / RNF-A02).
 */
export function WritingHandLoader({ className }: WritingHandLoaderProps) {
  return (
    <div
      className={cn('writing-hand-loader relative mx-auto w-full max-w-[240px]', className)}
      data-testid="writing-hand-loader"
    >
      <style id={LOADER_STYLE_ID}>{`
        .writing-hand-loader__quill-rotate {
          transform-box: view-box;
          transform-origin: 110px 170px;
        }
        @media (prefers-reduced-motion: no-preference) {
          @keyframes writing-hand-loader-quill {
            0%, 100% { transform: translate(0px, 0px); }
            28%      { transform: translate(150px, 0px); }
            32%      { transform: translate(0px, 40px); }
            58%      { transform: translate(150px, 40px); }
            62%      { transform: translate(0px, 80px); }
            88%      { transform: translate(150px, 80px); }
          }
          @keyframes writing-hand-loader-quill-rotate {
            0%, 100% { transform: rotate(-3deg); }
            50%      { transform: rotate(3deg); }
          }
          @keyframes writing-hand-loader-cursive {
            0%, 100% { opacity: 0.25; }
            45%      { opacity: 0.95; }
          }
          .writing-hand-loader__quill {
            animation: writing-hand-loader-quill 3.6s ease-in-out infinite;
          }
          .writing-hand-loader__quill-rotate {
            animation: writing-hand-loader-quill-rotate 0.5s ease-in-out infinite;
          }
          .writing-hand-loader__cursive-line {
            animation: writing-hand-loader-cursive 2.4s ease-in-out infinite;
          }
          .writing-hand-loader__cursive-line--delay-1 {
            animation-delay: 0.4s;
          }
          .writing-hand-loader__cursive-line--delay-2 {
            animation-delay: 0.8s;
          }
        }
      `}</style>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 360 380"
        aria-hidden="true"
        overflow="visible"
        className="block h-auto w-full overflow-visible"
      >
        <defs>
          <filter
            id="writing-hand-loader-remove-black"
            x="-5%"
            y="-5%"
            width="110%"
            height="110%"
          >
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0.299 0.587 0.114 0 0"
            />
            <feComponentTransfer>
              <feFuncA type="linear" slope="100" intercept="0" />
            </feComponentTransfer>
          </filter>
        </defs>

        {/* Pergamino — PNG RGBA, transparencia nativa (sin filter ni backdrop). */}
        <image
          href={parchmentUrl}
          x="0"
          y="0"
          width="360"
          height="380"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Trazos cursivos titilantes — tres renglones de "letra manuscrita". */}
        <g stroke="#3a2412" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path
            className="writing-hand-loader__cursive-line"
            d="M110 170 q12 -14 24 0 t24 0 t24 0 t24 0 t24 0 t24 0"
          />
          <path
            className="writing-hand-loader__cursive-line writing-hand-loader__cursive-line--delay-1"
            d="M110 210 c8 -12 18 -12 26 -2 s18 12 26 0 s18 -12 26 0 s18 12 26 0 s12 -10 20 -6"
          />
          <path
            className="writing-hand-loader__cursive-line writing-hand-loader__cursive-line--delay-2"
            d="M110 250 q10 -12 20 -4 t20 4 t20 -4 t20 4 t20 -4 t20 4 t20 -2"
          />
        </g>

        {/* Pluma — bbox 170x170; la nib en aprox (15,85) % del JPEG queda en
            (85+25.5, 26+144.5) = (110, 170), coincidente con el inicio del
            primer renglón cuando translate = (0,0). Dos grupos anidados:
              - exterior: translate por los tres renglones (gesto macro).
              - interior: rotate oscilante con pivot fijo en la nib, para que
                la punta superior derecha "vibre" mientras la nib permanece
                anclada sobre el renglón (gesto micro de la mano que escribe). */}
        <g className="writing-hand-loader__quill">
          <g className="writing-hand-loader__quill-rotate">
            <image
              href={quillUrl}
              x="85"
              y="26"
              width="170"
              height="170"
              preserveAspectRatio="xMidYMid meet"
              filter="url(#writing-hand-loader-remove-black)"
            />
          </g>
        </g>
      </svg>
    </div>
  )
}
