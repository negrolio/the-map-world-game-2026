export type IsoCountryCode = string

export type QuestionMode = 'country' | 'capital'

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
}

export interface Round {
  readonly id: string
  readonly roundNumber: number
  readonly targetCountryCode: IsoCountryCode
  readonly prompt: string
  readonly guess?: Guess
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
