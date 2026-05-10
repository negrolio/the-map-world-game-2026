import { datasetVersion } from './dataset-version'

export const dataShell = {
  id: 'data',
  status: 'ready',
  datasetVersion,
} as const

export { datasetVersion }
export { countriesCatalog, getContinentForIso2 } from './countries'
export type { ContinentCode, CountryRecord } from './countries'
export { loadCountriesCatalog, loadDatasetBundle, loadWorldTopology } from './loaders'
