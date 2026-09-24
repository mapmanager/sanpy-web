import { describe, expect, it } from 'vitest'
import { loadSanPyTable, nicePoolDataset } from '../src/data/sanPyTable'
import type { LoadedSanPyCollection } from '../src/models/traceCollection'

const collection: LoadedSanPyCollection = {
  root: new URL('https://example.test/sample.sanpy.zarr/'),
  fetch: async () => new Response('spikeNumber,sweep,peakSec,peakVal\n7,0,1.25,42\n'),
  collection: {
    format: 'sanpy-zarr', version: '1.0-draft', id: 'c', name: 'c', created_at: '', members: [],
  },
}

describe('loadSanPyTable', () => {
  it('loads a CSV-only analysis-results table', async () => {
    const rows = await loadSanPyTable(
      collection,
      'recordings/r1/recording.json',
      { rows: 1, representations: { csv: 'analysis_results.csv' } },
    )
    expect(rows).toEqual([{ spikeNumber: 7, sweep: 0, peakSec: 1.25, peakVal: 42 }])
  })

  it('rejects a table whose persisted row count disagrees with its manifest', async () => {
    await expect(loadSanPyTable(
      collection,
      'recordings/r1/recording.json',
      { rows: 2, representations: { csv: 'analysis_results.csv' } },
    )).rejects.toThrow('row count mismatch')
  })

  it('configures contract-declared plot groups for NicePool', () => {
    const rows = [{ spikeNumber: 1, sweep: 2, epoch: 0, epochLevel: -100, dacCommand: 5, include: true }]
    const definitions = {
      spikeNumber: { type: 'int', axis_label: 'Spike number', category: 'identity', is_categorical: false, show_in_plot_menu: true },
      sweep: { type: 'int', axis_label: 'Sweep', category: 'acquisition', is_categorical: true, show_in_plot_menu: true },
      epoch: { type: 'int', axis_label: 'Epoch', category: 'acquisition', is_categorical: true, show_in_plot_menu: true },
      epochLevel: { type: 'float', axis_label: 'Epoch level', category: 'acquisition', is_categorical: true, show_in_plot_menu: true },
      dacCommand: { type: 'float', axis_label: 'DAC command', category: 'acquisition', is_categorical: false, show_in_plot_menu: false },
      include: { type: 'bool', axis_label: 'Included', category: 'metadata', is_categorical: true, show_in_plot_menu: false },
    }

    const dataset = nicePoolDataset(rows, definitions)

    expect(dataset.preFilterColumns).toEqual(['epoch'])
    expect(dataset.schema?.filter(({ categorical }) => categorical).map(({ name }) => name)).toEqual([
      'sweep',
      'epoch',
      'epochLevel',
    ])
    expect(dataset.schema?.find(({ name }) => name === 'epochLevel')).toEqual({
      name: 'epochLevel',
      type: 'number',
      axis_label: 'Epoch level',
      category: 'acquisition',
      categorical: true,
    })
  })

  it('uses documented schema fallbacks for an unknown result column', () => {
    const dataset = nicePoolDataset([{ spikeNumber: 1, pluginResult: 2 }], {
      spikeNumber: { type: 'int', axis_label: 'Spike number', category: 'identity', is_categorical: false, show_in_plot_menu: true },
    })

    expect(dataset.schema?.find(({ name }) => name === 'pluginResult')).toEqual({
      name: 'pluginResult',
      type: 'string',
      axis_label: 'pluginResult',
      category: 'custom',
      categorical: false,
    })
  })
})
