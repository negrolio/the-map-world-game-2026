import { datasetVersion } from './dataset-version'

export const dataShell = {
  id: 'data',
  status: 'ready',
  datasetVersion,
} as const

export { datasetVersion }
export { countriesCatalog } from './countries'
export type { CountryRecord } from './countries'
export { loadCountriesCatalog, loadDatasetBundle, loadWorldTopology } from './loaders'
