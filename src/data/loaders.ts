import { datasetVersion } from './dataset-version'
import { countriesCatalog, type CountryRecord } from './countries'
import { worldTopology } from './world-topology'

export interface DatasetBundle {
  readonly version: string
  readonly countries: readonly CountryRecord[]
  readonly topology: unknown
}

export async function loadCountriesCatalog(): Promise<readonly CountryRecord[]> {
  return countriesCatalog
}

export async function loadWorldTopology(): Promise<unknown> {
  return worldTopology
}

export async function loadDatasetBundle(): Promise<DatasetBundle> {
  const [countries, topology] = await Promise.all([loadCountriesCatalog(), loadWorldTopology()])

  return {
    version: datasetVersion,
    countries,
    topology,
  }
}
