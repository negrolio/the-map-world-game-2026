import { buildGameResult } from './game-result'
import type { GameSession } from '../types'

export type AntiCheatIncidentSource = 'window_blur' | 'document_hidden'

export interface AntiCheatPolicyResult {
  readonly nextSession: GameSession
  readonly incidentSource: AntiCheatIncidentSource
  readonly didAbortGame: boolean
}

/**
 * Indica si los listeners anti-cheat deben contar incidentes para la sesión dada.
 *
 * F3 (UX feedback modo AI, PRD §4.4 RF-I40..RF-I45): mientras la ronda activa
 * tiene `guess` (está cerrada) y el usuario aún no avanzó, los eventos
 * `window_blur` / `document_hidden` se ignoran. Aplica a todos los modos.
 *
 * - `false` cuando `session === null` o `session.status !== 'playing'`.
 * - `false` cuando la ronda activa ya tiene `guess` (ronda cerrada,
 *   pendiente de `onAdvanceRound`).
 * - `true` durante una partida en curso con ronda activa abierta
 *   (sin `guess` aún), donde sí corresponde contar incidentes.
 */
export function isAntiCheatActive(session: GameSession | null): session is GameSession {
  if (!session || session.status !== 'playing') {
    return false
  }

  const activeRound = session.rounds[session.activeRoundIndex]
  if (activeRound?.guess) {
    return false
  }

  return true
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
