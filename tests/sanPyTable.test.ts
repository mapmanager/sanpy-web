import { describe, expect, it } from 'vitest'
import { loadSanPyTable } from '../src/data/sanPyTable'
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
})
