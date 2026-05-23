import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { loadLocalEnvIfNeeded } from '../../api/_lib/load-local-env.js'
import { getDefaultPromptsDeps } from './create-default-prompts-deps.js'
import { generateAiPrompts } from './generate-ai-prompts.js'

function ensureEnvLocalLoaded(): void {
  loadLocalEnvIfNeeded()
  const path = resolve(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (!key || process.env[key] !== undefined) continue
    process.env[key] = trimmed.slice(eq + 1).trim()
  }
}

describe('generateAiPrompts — integration', () => {
  it('returns at least one valid item for AR when GEMINI_API_KEY is set', async () => {
    ensureEnvLocalLoaded()
    if (!process.env.GEMINI_API_KEY?.trim()) {
      return
    }

    const result = await generateAiPrompts(
      {
        items: [{ iso2: 'AR' }],
        tags: ['historia'],
        locale: 'es',
        seed: 42,
      },
      getDefaultPromptsDeps(),
    )

    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (result.ok) {
      expect(result.data.items.length).toBeGreaterThan(0)
    }
  }, 120_000)
})
