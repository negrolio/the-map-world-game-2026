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
 * Composición de movimientos de la pluma (sin dos `<g>` animados a la vez —
 * WebKit/iOS suele ignorar animaciones `transform` anidadas en SVG):
 * 1. Grupo `.writing-hand-loader__quill` → `translate` por los tres renglones.
 * 2. `<image class="writing-hand-loader__quill-tilt">` → `rotate` con pivot en
 *    la nib vía `translate() rotate() translate()` (SVG 1.1, estable en Safari).
 *
 * Sin nuevas dependencias de procesamiento de imágenes (regla
 * `dependency-security.mdc`). Las animaciones se aplican siempre (sin envolver
 * en `@media (prefers-reduced-motion: no-preference)`): el loader es un
 * indicador funcional de "estoy trabajando" y el dueño del producto decidió
 * mantenerlo visible incluso con el sistema operativo pidiendo reducir
 * movimiento (desvío explícito de RF-F54 / RF-A04 / RNF-A02 — ver Fase 5
 * "Ajuste post-revisión UX 2026-05-28" en el todo).
 */
export function WritingHandLoader({ className }: WritingHandLoaderProps) {
  return (
    <div
      className={cn('writing-hand-loader relative mx-auto w-full max-w-[240px]', className)}
      data-testid="writing-hand-loader"
    >
      <style id={LOADER_STYLE_ID}>{`
        @keyframes writing-hand-loader-quill {
          0%, 100% { transform: translate3d(0, 0, 0); }
          28%      { transform: translate3d(150px, 0, 0); }
          32%      { transform: translate3d(0, 40px, 0); }
          58%      { transform: translate3d(150px, 40px, 0); }
          62%      { transform: translate3d(0, 80px, 0); }
          88%      { transform: translate3d(150px, 80px, 0); }
        }
        /* Pivot en la nib (~15%, 50% del bbox 170×170) sin transform-origin SVG */
        @keyframes writing-hand-loader-quill-tilt {
          0%, 100% {
            transform: translate(25.5px, 85px) rotate(-3deg) translate(-25.5px, -85px);
          }
          50% {
            transform: translate(25.5px, 85px) rotate(3deg) translate(-25.5px, -85px);
          }
        }
        @keyframes writing-hand-loader-cursive {
          0%, 100% { opacity: 0.25; }
          45%      { opacity: 0.95; }
        }
        .writing-hand-loader__quill {
          will-change: transform;
          animation: writing-hand-loader-quill 3.6s ease-in-out infinite;
        }
        .writing-hand-loader__quill-tilt {
          will-change: transform;
          animation: writing-hand-loader-quill-tilt 0.5s ease-in-out infinite;
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

        {/* Pluma — bbox 170×170; la nib en ~(15,85) del JPEG → (110,170) del
            viewBox con translate=(0,0). Un solo `<g>` animado + `<image>` con
            tilt evita el bug de WebKit con dos transforms animados en cadena. */}
        <g className="writing-hand-loader__quill">
          <image
            className="writing-hand-loader__quill-tilt"
            href={quillUrl}
            x="85"
            y="26"
            width="170"
            height="170"
            preserveAspectRatio="xMidYMid meet"
            filter="url(#writing-hand-loader-remove-black)"
          />
        </g>
      </svg>
    </div>
  )
}
