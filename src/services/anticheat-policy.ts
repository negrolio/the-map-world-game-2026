import { buildGameResult } from './game-result'
import type { GameSession } from '../types'

export type AntiCheatIncidentSource = 'window_blur' | 'document_hidden'

export interface AntiCheatPolicyResult {
  readonly nextSession: GameSession
  readonly incidentSource: AntiCheatIncidentSource
  readonly didAbortGame: boolean
}

export function applyAntiCheatIncident(
  session: GameSession,
  incidentSource: AntiCheatIncidentSource,
): AntiCheatPolicyResult {
  const nextIncidentCount = session.incidentCount + 1

  if (session.config.antiCheatMode === 'strict') {
    return {
      nextSession: {
        ...session,
        status: 'aborted',
        incidentCount: nextIncidentCount,
        result: buildGameResult(session.players, session.rounds.length),
      },
      incidentSource,
      didAbortGame: true,
    }
  }

  return {
    nextSession: {
      ...session,
      incidentCount: nextIncidentCount,
    },
    incidentSource,
    didAbortGame: false,
  }
}
