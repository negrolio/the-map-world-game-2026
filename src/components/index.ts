export const componentShell = {
  id: 'components',
  status: 'ready',
} as const

export { AppErrorBoundary } from './app-error-boundary'
export { GamePlayersHud } from './GamePlayersHud'
export type { GamePlayersHudProps } from './GamePlayersHud'
export { WorldMap } from './WorldMap'
export type { MapAnswerFeedback, WorldMapProps } from './WorldMap'
