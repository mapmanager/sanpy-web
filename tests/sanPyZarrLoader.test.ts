import { describe, expect, it } from 'vitest'
import { loadDetectionParameters, loadSanPyCollection, loadSanPyMetadata, loadTraceOverlays } from '../src/data/sanPyZarrLoader'
import type { LoadedSanPyCollection } from '../src/models/traceCollection'

const valid = {
  format: 'sanpy-zarr',
  version: '1.0-draft',
  id: 'collection',
  name: 'Sample',
  created_at: '2026-09-06T12:00:00+00:00',
  members: [{
    id: 'r1',
    name: 'one.abf',
    recording: 'recordings/r1/recording.json',
    summary: {
      sweeps: 1,
      channels: 1,
      points: 10,
      sampling_rate_hz: 10000,
      analysis_results: 0,
      protocol: '',
      acquisition_datetime: '',
    },
  }],
}

const fetchJson = (value: unknown) => async () => new Response(JSON.stringify(value), { status: 200 })

describe('loadSanPyCollection', () => {
  it('accepts the SanPy Zarr draft contract', async () => {
    const loaded = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    expect(loaded.collection.name).toBe('Sample')
  })

  it('rejects traversal paths', async () => {
    const invalid = { ...valid, members: [{ ...valid.members[0], recording: '../secret' }] }
    await expect(loadSanPyCollection('https://example.test/', fetchJson(invalid))).rejects.toThrow('Invalid')
  })

  it('rejects unsupported versions', async () => {
    await expect(loadSanPyCollection('https://example.test/', fetchJson({ ...valid, version: '1.0' }))).rejects.toThrow('Unsupported')
  })

  it('loads the selected recording SanPy metadata document', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    source.fetch = fetchJson({ Species: 'mouse', Include: 'yes' }) as LoadedSanPyCollection['fetch']
    await expect(loadSanPyMetadata(source, valid.members[0].recording, 'metadata/sanpy_metadata.json')).resolves.toEqual({ Species: 'mouse', Include: 'yes' })
  })

  it('rejects non-object SanPy metadata', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    source.fetch = fetchJson(['not', 'metadata']) as LoadedSanPyCollection['fetch']
    await expect(loadSanPyMetadata(source, valid.members[0].recording, 'metadata/sanpy_metadata.json')).rejects.toThrow('Invalid')
  })

  it('loads detection parameters as JSON key/value data', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    source.fetch = fetchJson({ detectionName: 'Fast Neuron', dvdtThreshold: 20 }) as LoadedSanPyCollection['fetch']
    await expect(loadDetectionParameters(source, valid.members[0].recording, 'metadata/detection_parameters.json')).resolves.toEqual({ detectionName: 'Fast Neuron', dvdtThreshold: 20 })
  })

  it('rejects duplicate runtime overlay identifiers', async () => {
    const source = await loadSanPyCollection('https://example.test/', fetchJson(valid))
    source.fetch = fetchJson({ overlays: [
      { id: 'peaks', label: 'Peaks', x_result: 'x', y_result: 'y', point_id_result: 'id', sweep_result: 'sweep' },
      { id: 'peaks', label: 'Again', x_result: 'x', y_result: 'y', point_id_result: 'id', sweep_result: 'sweep' },
    ] }) as LoadedSanPyCollection['fetch']
    await expect(loadTraceOverlays(source, valid.members[0].recording, 'metadata/trace_overlays.json')).rejects.toThrow('Invalid')
  })
})
