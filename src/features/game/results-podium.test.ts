import { describe, expect, it } from 'vitest'

import type { Player } from '../../types'
import {
  buildResultsLayout,
  computeRankPosition,
  isHeroRankTestIdOwner,
  isScoreTied,
  medalForRankPosition,
  resolveHeroAward,
  resolveHeroTrophyVariant,
  resolvePodiumAward,
  resolveSoloTrophyVariant,
} from './results-podium'

function player(
  id: string,
  name: string,
  score: number,
  turnOrder: number,
  correct = 0,
  wrong = 0,
): Player {
  return {
    id,
    name,
    turnOrder,
    score,
    correctAnswers: correct,
    wrongAnswers: wrong,
  }
}

describe('results-podium', () => {
  it('computeRankPosition assigns shared rank for equal scores', () => {
    const leaderboard = [
      player('a', 'Ana', 10, 0),
      player('b', 'Bob', 10, 1),
      player('c', 'Cara', 5, 2),
    ]

    expect(computeRankPosition(leaderboard[0], leaderboard)).toBe(1)
    expect(computeRankPosition(leaderboard[1], leaderboard)).toBe(1)
    expect(computeRankPosition(leaderboard[2], leaderboard)).toBe(3)
  })

  it('isScoreTied detects ties by score', () => {
    const leaderboard = [
      player('a', 'Ana', 10, 0),
      player('b', 'Bob', 10, 1),
      player('c', 'Cara', 5, 2),
    ]

    expect(isScoreTied(leaderboard[0], leaderboard)).toBe(true)
    expect(isScoreTied(leaderboard[2], leaderboard)).toBe(false)
  })

  it('medalForRankPosition maps gold/silver/bronze', () => {
    expect(medalForRankPosition(1)).toBe('gold')
    expect(medalForRankPosition(2)).toBe('silver')
    expect(medalForRankPosition(3)).toBe('bronze')
    expect(medalForRankPosition(4)).toBeNull()
  })

  it('buildResultsLayout with 1 player: hero only, no podium', () => {
    const leaderboard = [player('a', 'Ana', 3, 0, 1, 0)]
    const layout = buildResultsLayout(leaderboard)

    expect(layout).not.toBeNull()
    expect(layout?.hero.player.id).toBe('a')
    expect(layout?.podium).toHaveLength(0)
    expect(layout?.rest).toHaveLength(0)
    expect(layout?.allEntries).toHaveLength(1)
  })

  it('buildResultsLayout with 2 players: hero + podium of 2, empty rest', () => {
    const leaderboard = [
      player('a', 'Ana', 10, 0),
      player('b', 'Bob', 5, 1),
    ]
    const layout = buildResultsLayout(leaderboard)

    expect(layout?.podium).toHaveLength(2)
    expect(layout?.rest).toHaveLength(0)
    expect(layout?.podium[0].player.id).toBe('a')
    expect(layout?.podium[1].player.id).toBe('b')
  })

  it('buildResultsLayout with 4 players: podium 3 + rest 1', () => {
    const leaderboard = [
      player('a', 'Ana', 10, 0),
      player('b', 'Bob', 8, 1),
      player('c', 'Cara', 6, 2),
      player('d', 'Dan', 2, 3),
    ]
    const layout = buildResultsLayout(leaderboard)

    expect(layout?.podium).toHaveLength(3)
    expect(layout?.rest).toHaveLength(1)
    expect(layout?.rest[0].player.id).toBe('d')
    expect(layout?.rest[0].leaderboardIndex).toBe(3)
  })

  it('resolveSoloTrophyVariant maps accuracy tiers', () => {
    expect(resolveSoloTrophyVariant(100)).toBe('gold')
    expect(resolveSoloTrophyVariant(85)).toBe('silver')
    expect(resolveSoloTrophyVariant(71)).toBe('silver')
    expect(resolveSoloTrophyVariant(70)).toBe('bronze')
    expect(resolveSoloTrophyVariant(40)).toBe('bronze')
    expect(resolveSoloTrophyVariant(0)).toBe('bronze')
  })

  it('resolveHeroTrophyVariant uses podium order in multiplayer', () => {
    const leaderboard = [
      player('a', 'Ana', 10, 0, 1, 1),
      player('b', 'Bob', 5, 1),
      player('c', 'Cara', 3, 2),
    ]
    const layout = buildResultsLayout(leaderboard)
    expect(layout).not.toBeNull()

    expect(resolveHeroTrophyVariant(layout!.podium[0], false, 50)).toBe('gold')
    expect(resolveHeroTrophyVariant(layout!.podium[1], false, 50)).toBe('silver')
    expect(resolveHeroTrophyVariant(layout!.podium[2], false, 50)).toBe('bronze')
  })

  it('resolveHeroTrophyVariant uses accuracy when solo', () => {
    const leaderboard = [player('a', 'Ana', 10, 0, 1, 0)]
    const layout = buildResultsLayout(leaderboard)
    expect(layout).not.toBeNull()

    expect(resolveHeroTrophyVariant(layout!.hero, true, 100)).toBe('gold')
    expect(resolveHeroTrophyVariant(layout!.hero, true, 80)).toBe('silver')
    expect(resolveHeroTrophyVariant(layout!.hero, true, 30)).toBe('bronze')
  })

  it('resolveHeroAward returns empty when no correct answers', () => {
    const soloNoCorrect = buildResultsLayout([player('a', 'Ana', -5, 0, 0, 1)])
    expect(soloNoCorrect).not.toBeNull()
    expect(resolveHeroAward(soloNoCorrect!.hero, true, 0)).toBe('empty')

    const soloWithCorrect = buildResultsLayout([player('a', 'Ana', 10, 0, 1, 0)])
    expect(resolveHeroAward(soloWithCorrect!.hero, true, 100)).toBe('gold')
  })

  it('resolvePodiumAward returns empty when no correct answers', () => {
    const leaderboard = [
      player('a', 'Ana', 10, 0, 1, 0),
      player('b', 'Bob', 0, 1, 0, 1),
    ]
    const layout = buildResultsLayout(leaderboard)
    expect(layout).not.toBeNull()

    expect(resolvePodiumAward(layout!.podium[0])).toBe('gold')
    expect(resolvePodiumAward(layout!.podium[1])).toBe('empty')
  })

  it('isHeroRankTestIdOwner identifies hero for testid placement', () => {
    const leaderboard = [
      player('a', 'Ana', 10, 0),
      player('b', 'Bob', 5, 1),
    ]
    const layout = buildResultsLayout(leaderboard)
    expect(layout).not.toBeNull()

    expect(isHeroRankTestIdOwner(layout!.hero, layout!.hero)).toBe(true)
    expect(isHeroRankTestIdOwner(layout!.podium[1], layout!.hero)).toBe(false)
    expect(isHeroRankTestIdOwner(layout!.podium[0], layout!.hero)).toBe(true)
  })
})
