export const setupFeatureShell = {
  id: 'setup',
  status: 'ready',
} as const

export { setupConfigSchema, validateSetupConfigSchema } from './setup-config-schema'
export type { SetupSchemaValidationResult } from './setup-config-schema'
export { AiTriviaTagsPicker } from './AiTriviaTagsPicker'
export type { AiTriviaTagsPickerProps } from './AiTriviaTagsPicker'
export { SetupModeCard } from './SetupModeCard'
export type { SetupModeCardProps } from './SetupModeCard'
export { SetupModeCardGroup } from './SetupModeCardGroup'
export type { SetupModeCardGroupProps } from './SetupModeCardGroup'
export { SetupView } from './SetupView'
export type { SetupViewProps } from './SetupView'
