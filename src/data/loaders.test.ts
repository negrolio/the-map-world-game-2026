import { describe, expect, it } from 'vitest'

import { datasetVersion } from './dataset-version'
import { loadCountriesCatalog, loadDatasetBundle, loadWorldTopology } from './loaders'

describe('dataset loaders', () => {
  it('carga una muestra de paises con capital y continente', async () => {
    const countries = await loadCountriesCatalog()
    const argentina = countries.find((country) => country.iso2 === 'AR')
    const japan = countries.find((country) => country.iso2 === 'JP')

    expect(argentina).toMatchObject({
      name: 'Argentina',
      capital: 'Buenos Aires',
      continent: 'americas',
    })
    expect(japan).toMatchObject({
      name: 'Japan',
      capital: 'Tokyo',
      continent: 'asia',
    })
  })

  it('expone topology con estructura Topology', async () => {
    const topology = (await loadWorldTopology()) as { type?: string }
    expect(topology.type).toBe('Topology')
  })

  it('incluye datasetVersion en el bundle cargado', async () => {
    const bundle = await loadDatasetBundle()
    expect(bundle.version).toBe(datasetVersion)
    expect(bundle.countries.length).toBeGreaterThan(0)
  })
})
