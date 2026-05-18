export type VercelRequest = {
  method?: string
  headers?: { origin?: string; [key: string]: string | string[] | undefined }
  query?: Record<string, string | string[] | undefined>
}

export type VercelResponse = {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
  end: (body?: string) => void
}
