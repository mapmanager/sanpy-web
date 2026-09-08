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

  it('configures epoch filtering and categorical epoch levels for NicePool', () => {
    const rows = [{ spikeNumber: 1, epoch: 0, epochLevel: -100, peakVal: 42 }]
    const definitions = {
      spikeNumber: { type: 'int', axis_label: 'Spike number', category: 'identity' },
      epoch: { type: 'int', axis_label: 'Epoch', category: 'identity' },
      epochLevel: { type: 'float', axis_label: 'Epoch level', category: 'stimulus' },
      peakVal: { type: 'float', axis_label: 'Peak voltage (mV)', category: 'waveform' },
    }

    const dataset = nicePoolDataset(rows, definitions)

    expect(dataset.preFilterColumns).toEqual(['epoch'])
    expect(dataset.schema?.find(({ name }) => name === 'epochLevel')).toEqual({
      name: 'epochLevel',
      type: 'number',
      axis_label: 'Epoch level',
      category: 'stimulus',
      categorical: true,
    })
  })

  it('uses documented schema fallbacks for an unknown result column', () => {
    const dataset = nicePoolDataset([{ spikeNumber: 1, pluginResult: 2 }], {
      spikeNumber: { type: 'int', axis_label: 'Spike number', category: 'identity' },
    })

    expect(dataset.schema?.find(({ name }) => name === 'pluginResult')).toEqual({
      name: 'pluginResult',
      type: 'string',
      axis_label: 'pluginResult',
      category: 'custom',
    })
  })
})
