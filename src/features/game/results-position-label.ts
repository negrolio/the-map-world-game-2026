import type { TFunction } from 'i18next'

export function resolvePositionLabel(
  rankPosition: number,
  t: TFunction<'results'>,
): string {
  if (rankPosition === 1) {
    return t('positionFirst')
  }
  if (rankPosition === 2) {
    return t('positionSecond')
  }
  if (rankPosition === 3) {
    return t('positionThird')
  }
  return t('positionNth', { n: rankPosition })
}
