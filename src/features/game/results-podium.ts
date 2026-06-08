import type { Player } from '../../types'

export type PodiumMedal = 'gold' | 'silver' | 'bronze'

export interface RankedPlayerEntry {
  readonly player: Player
  /** 0-based index in the sorted leaderboard array. */
  readonly leaderboardIndex: number
  /** Display position by score (1 = best); players with equal score share the same value. */
  readonly rankPosition: number
  readonly medal: PodiumMedal | null
  readonly isScoreTied: boolean
}

export interface ResultsLayout {
  /** Top player; always present when leaderboard is non-empty. */
  readonly hero: RankedPlayerEntry
  /** First min(3, n) players for podium visuals (may include the hero player). Empty when n === 1. */
  readonly podium: readonly RankedPlayerEntry[]
  /** Players beyond the podium (leaderboard index >= min(3, n)). */
  readonly rest: readonly RankedPlayerEntry[]
  readonly allEntries: readonly RankedPlayerEntry[]
}

const PODIUM_MAX = 3

/**
 * Computes display rank by score: 1 + number of players with strictly higher score.
 * Players with the same score share rankPosition (ADR D3).
 */
export function computeRankPosition(
  player: Player,
  leaderboard: readonly Player[],
): number {
  const higherCount = leaderboard.filter((entry) => entry.score > player.score).length
  return higherCount + 1
}

export function isScoreTied(player: Player, leaderboard: readonly Player[]): boolean {
  return leaderboard.some(
    (entry) => entry.id !== player.id && entry.score === player.score,
  )
}

export function medalForRankPosition(rankPosition: number): PodiumMedal | null {
  if (rankPosition === 1) {
    return 'gold'
  }
  if (rankPosition === 2) {
    return 'silver'
  }
  if (rankPosition === 3) {
    return 'bronze'
  }
  return null
}

/**
 * Trophy color for a single-player game, by answer accuracy (ADR results-redesign,
 * follow-up 2026-06-08): 100% gold, >70% silver, otherwise bronze.
 */
export function resolveSoloTrophyVariant(accuracy: number): PodiumMedal {
  if (accuracy >= 100) {
    return 'gold'
  }
  if (accuracy > 70) {
    return 'silver'
  }
  return 'bronze'
}

/**
 * Trophy color for the hero panel. Multiplayer follows podium order (1st gold,
 * 2nd silver, 3rd bronze); single player follows accuracy.
 */
export function resolveHeroTrophyVariant(
  entry: RankedPlayerEntry,
  isSoloPlayer: boolean,
  accuracy: number,
): PodiumMedal {
  if (isSoloPlayer) {
    return resolveSoloTrophyVariant(accuracy)
  }
  return entry.medal ?? 'bronze'
}

/** Award shown next to a player: a colored trophy, or a fishbone when no answer was guessed. */
export type ResultsAward = PodiumMedal | 'empty'

/** A player with zero correct answers "guessed nothing" → no trophy. */
export function guessedNothing(entry: RankedPlayerEntry): boolean {
  return entry.player.correctAnswers <= 0
}

export function resolveHeroAward(
  entry: RankedPlayerEntry,
  isSoloPlayer: boolean,
  accuracy: number,
): ResultsAward {
  if (guessedNothing(entry)) {
    return 'empty'
  }
  return resolveHeroTrophyVariant(entry, isSoloPlayer, accuracy)
}

export function resolvePodiumAward(entry: RankedPlayerEntry): ResultsAward {
  if (guessedNothing(entry)) {
    return 'empty'
  }
  return entry.medal ?? 'bronze'
}

function buildEntry(
  player: Player,
  leaderboardIndex: number,
  leaderboard: readonly Player[],
): RankedPlayerEntry {
  const rankPosition = computeRankPosition(player, leaderboard)
  return {
    player,
    leaderboardIndex,
    rankPosition,
    medal: medalForRankPosition(rankPosition),
    isScoreTied: isScoreTied(player, leaderboard),
  }
}

/**
 * Splits a sorted leaderboard into hero, podium (top min(3, n)) and rest.
 * With a single player there is no podium (ADR D2/D3).
 */
export function buildResultsLayout(leaderboard: readonly Player[]): ResultsLayout | null {
  if (leaderboard.length === 0) {
    return null
  }

  const allEntries = leaderboard.map((player, index) =>
    buildEntry(player, index, leaderboard),
  )
  const hero = allEntries[0]
  const podiumSize =
    leaderboard.length === 1 ? 0 : Math.min(PODIUM_MAX, leaderboard.length)
  const podium = podiumSize > 0 ? allEntries.slice(0, podiumSize) : []
  const rest = podiumSize > 0 ? allEntries.slice(podiumSize) : []

  return { hero, podium, rest, allEntries }
}

/** Whether this entry should carry `finished-rank-*` on the hero (not duplicated on podium). */
export function isHeroRankTestIdOwner(
  entry: RankedPlayerEntry,
  hero: RankedPlayerEntry,
): boolean {
  return entry.player.id === hero.player.id
}
