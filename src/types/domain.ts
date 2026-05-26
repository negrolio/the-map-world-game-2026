import type { AiPromptSource } from '../../shared/ai-trivia-api'
import type { AiTriviaTagId } from '../../shared/ai-trivia-tags-schema'

export type IsoCountryCode = string

export type QuestionMode = 'country' | 'capital' | 'ai'

export type RegionFilter = 'world' | 'africa' | 'americas' | 'asia' | 'europe' | 'oceania'

export type AntiCheatMode = 'normal' | 'strict'

export type GameStatus = 'setup' | 'playing' | 'finished' | 'aborted'

export interface Player {
  readonly id: string
  readonly name: string
  readonly turnOrder: number
  readonly score: number
  readonly correctAnswers: number
  readonly wrongAnswers: number
}

export interface GameConfig {
  readonly players: readonly string[]
  readonly questionMode: QuestionMode
  readonly regionFilter: RegionFilter
  readonly antiCheatMode: AntiCheatMode
  readonly questionCount: number
  /**
   * Tags temáticos seleccionados en Setup para `questionMode === 'ai'`.
   * Ausente o vacío significa "cualquier tag del catálogo" (PRD RF-D02).
   */
  readonly tags?: readonly AiTriviaTagId[]
}

export interface AiAttempt {
  readonly playerId: string
  readonly selectedCountryCode: IsoCountryCode
  readonly isCorrect: boolean
  readonly attemptedAtISO: string
  readonly scoreDelta: number
}

export interface Round {
  readonly id: string
  readonly roundNumber: number
  readonly targetCountryCode: IsoCountryCode
  readonly prompt: string
  readonly guess?: Guess
  /**
   * Historial de intentos solo en modo AI. Cada clic durante una ronda
   * abierta agrega una entrada aquí. La ronda se cierra (asignando `guess`)
   * cuando se acierta o se agotan `MAX_AI_ATTEMPTS` intentos.
   */
  readonly attempts?: readonly AiAttempt[]
  /**
   * Metadatos de la fuente Wikipedia declarada por el LLM. Solo presente
   * cuando la ronda nació de un ítem AI válido.
   */
  readonly aiSource?: AiPromptSource
  /**
   * Identificador opaco del riddle persistido en Convex, propagado desde
   * `QuestionPoolItem.aiRiddleId`. Solo presente para rondas de modo `'ai'`.
   */
  readonly aiRiddleId?: string
}

export interface Guess {
  readonly playerId: string
  readonly selectedCountryCode: IsoCountryCode
  readonly isCorrect: boolean
  readonly answeredAtISO: string
}

export interface GameResult {
  readonly winnerPlayerId?: string
  readonly leaderboard: readonly Player[]
  readonly totalRounds: number
}

export interface GameSession {
  readonly id: string
  readonly status: GameStatus
  readonly config: GameConfig
  readonly players: readonly Player[]
  readonly rounds: readonly Round[]
  readonly activeRoundIndex: number
  readonly incidentCount: number
  readonly result?: GameResult
  readonly datasetVersion: string
}

export type DomainErrorCode =
  | 'INVALID_CONFIG'
  | 'DATASET_UNAVAILABLE'
  | 'SESSION_NOT_FOUND'
  | 'ROUND_NOT_ACTIVE'
  | 'INVALID_GUESS'

export class DomainError extends Error {
  public readonly code: DomainErrorCode
  public readonly cause?: unknown

  public constructor(code: DomainErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.cause = cause
  }
}
