export type ShellStatus = 'ready'

export interface FeatureShell {
  readonly id: string
  readonly status: ShellStatus
}

export * from './api-contract'
export * from './domain'
