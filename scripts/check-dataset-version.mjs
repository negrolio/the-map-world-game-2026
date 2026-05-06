import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const datasetVersionPath = resolve(process.cwd(), 'src/data/dataset-version.ts')

const source = await readFile(datasetVersionPath, 'utf-8')
const match = source.match(
  /export\s+const\s+datasetVersion\s*=\s*['"`]([^'"`\s]+)['"`]/,
)

if (!match) {
  console.error(
    '[check:dataset-version] Missing exported datasetVersion constant in src/data/dataset-version.ts',
  )
  process.exit(1)
}

const version = match[1]

if (!version.trim()) {
  console.error('[check:dataset-version] datasetVersion cannot be empty')
  process.exit(1)
}

console.log(`[check:dataset-version] OK (${version})`)
