export type ShellStatus = 'ready'

export interface FeatureShell {
  readonly id: string
  readonly status: ShellStatus
}
