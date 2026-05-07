export const componentShell = {
  id: 'components',
  status: 'ready',
} as const

export { Button } from './Button'
export type { ButtonProps } from './Button'
export { GamePlayersHud } from './GamePlayersHud'
export type { GamePlayersHudProps } from './GamePlayersHud'
export { WorldMap } from './WorldMap'
export type { MapAnswerFeedback, WorldMapProps } from './WorldMap'
