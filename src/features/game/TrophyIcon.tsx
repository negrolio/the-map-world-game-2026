import { useId } from 'react'

import type { PodiumMedal } from './results-podium'

interface TrophyPalette {
  readonly light: string
  readonly mid: string
  readonly dark: string
}

const PALETTE_BY_VARIANT: Record<PodiumMedal, TrophyPalette> = {
  gold: { light: '#FFE9A8', mid: '#F6C544', dark: '#C98A22' },
  silver: { light: '#F4F6F8', mid: '#C9D2DA', dark: '#8A97A3' },
  bronze: { light: '#E8B98C', mid: '#C77B45', dark: '#8A4E26' },
}

const OUTLINE = '#2D1E0F'

export interface TrophyIconProps {
  readonly variant: PodiumMedal
  readonly className?: string
  /** Accessible label; when omitted the icon is decorative (aria-hidden). */
  readonly title?: string
}

/**
 * Recolorable trophy icon (gold / silver / bronze). Drawn as inline SVG so the
 * same asset can be tinted per podium position or accuracy tier without shipping
 * three separate images.
 */
export function TrophyIcon({ variant, className, title }: TrophyIconProps) {
  const gradientId = useId()
  const colors = PALETTE_BY_VARIANT[variant]

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="55%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
      </defs>

      <path
        d="M19 15 C8 15 8 28 21 30"
        fill="none"
        stroke={OUTLINE}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M45 15 C56 15 56 28 43 30"
        fill="none"
        stroke={OUTLINE}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M19 15 C10 15 10 27 21 29"
        fill="none"
        stroke={colors.mid}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M45 15 C54 15 54 27 43 29"
        fill="none"
        stroke={colors.mid}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <rect
        x="22"
        y="52"
        width="20"
        height="6"
        rx="1.5"
        fill={colors.mid}
        stroke={OUTLINE}
        strokeWidth="2"
      />
      <path
        d="M27 46 H37 L39.5 52 H24.5 Z"
        fill={colors.mid}
        stroke={OUTLINE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect
        x="29.5"
        y="37"
        width="5"
        height="9"
        fill={colors.mid}
        stroke={OUTLINE}
        strokeWidth="2"
      />

      <path
        d="M18 12 H46 L44.5 21 C44.5 31 39 38 32 38 C25 38 19.5 31 19.5 21 Z"
        fill={`url(#${gradientId})`}
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 16 C22 22 23 28 27 33"
        fill="none"
        stroke={colors.light}
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  )
}
