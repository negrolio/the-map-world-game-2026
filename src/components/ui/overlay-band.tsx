import type { HTMLAttributes } from 'react'

import { cn } from './cn'

export interface OverlayBandProps extends HTMLAttributes<HTMLDivElement> {
  readonly position: 'top' | 'bottom'
}

const positionStyles: Record<OverlayBandProps['position'], string> = {
  top: [
    'pointer-events-auto absolute inset-x-0 top-0 z-10',
    'bg-[image:var(--gradient-wood-top)]',
    'px-4 pb-4 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-6',
  ].join(' '),
  bottom: [
    'pointer-events-auto absolute inset-x-0 bottom-0 z-10',
    'bg-[image:var(--gradient-wood-bottom)]',
    'px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-4 sm:px-6',
  ].join(' '),
}

/**
 * Translucent dark band overlaid on top of the map, used in the game shell
 * for navigation/round info (top) and HUD + primary action (bottom).
 *
 * Uses CSS custom properties (`--gradient-wood-top` / `--gradient-wood-bottom`)
 * so the gradient color follows the design tokens automatically.
 */
export function OverlayBand({ position, className, children, ...props }: OverlayBandProps) {
  return (
    <div {...props} className={cn(positionStyles[position], className)}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">{children}</div>
    </div>
  )
}
