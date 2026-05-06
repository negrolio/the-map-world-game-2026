export interface ApiErrorPayload {
  readonly code: string
  readonly message: string
}

export type ApiResponse<TData> =
  | {
      readonly success: true
      readonly data: TData
      readonly error?: never
    }
  | {
      readonly success: false
      readonly data?: never
      readonly error: ApiErrorPayload
    }
