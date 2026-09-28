import { describe, expect, it } from 'vitest'
import { loadAnalysisResultDefinitions, loadDetectionParameterDefinitions, loadDetectionParameters, loadMetadataDefinitions, loadSanPyCollection, loadSanPyMetadata, loadSanPyRecording, loadTraceOverlays } from '../src/data/sanPyZarrLoader'
import type { LoadedSanPyCollection, SanPyCollection } from '../src/models/traceCollection'

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
    await expect(loadSanPyCollection('https://example.test/', fetchJson(invalid))).rejects.toThrow(
      'Invalid SanPy Zarr member recording in collection.json for "r1": "../secret" (expected a relative path)',
    )
  })

  it('rejects unsupported versions', async () => {
    await expect(loadSanPyCollection('https://example.test/', fetchJson({ ...valid, version: '1.0' }))).rejects.toThrow(
      'Unsupported SanPy Zarr collection version in collection.json: found "1.0", expected "1.0-draft"',
    )
  })

  it('loads the selected recording SanPy metadata document', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    source.fetch = fetchJson({ species: 'mouse', include: 'yes' }) as LoadedSanPyCollection['fetch']
    await expect(loadSanPyMetadata(source, valid.members[0].recording, 'metadata/experimental_metadata.json')).resolves.toEqual({ species: 'mouse', include: 'yes' })
  })

  it('rejects non-object SanPy metadata', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    source.fetch = fetchJson(['not', 'metadata']) as LoadedSanPyCollection['fetch']
    await expect(loadSanPyMetadata(source, valid.members[0].recording, 'metadata/experimental_metadata.json')).rejects.toThrow('Invalid')
  })

  it('loads metadata display definitions', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    const definitions = { animal_id: { display_name: 'Animal ID' } }
    source.fetch = fetchJson(definitions) as LoadedSanPyCollection['fetch']
    await expect(loadMetadataDefinitions(source, valid.members[0].recording, 'metadata/experimental_metadata_definitions.json')).resolves.toEqual(definitions)
  })

  it('loads detection parameters as JSON key/value data', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    source.fetch = fetchJson({ detectionName: 'Fast Neuron', dvdtThreshold: 20 }) as LoadedSanPyCollection['fetch']
    await expect(loadDetectionParameters(source, valid.members[0].recording, 'metadata/detection_parameters.json')).resolves.toEqual({ detectionName: 'Fast Neuron', dvdtThreshold: 20 })
  })

  it('adapts detection human names for the shared values panel', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    source.fetch = fetchJson({ dvdtThreshold: { humanName: 'dV/dt Threshold' } }) as LoadedSanPyCollection['fetch']
    await expect(loadDetectionParameterDefinitions(source, valid.members[0].recording, 'metadata/detection_parameter_definitions.json')).resolves.toEqual({ dvdtThreshold: { display_name: 'dV/dt Threshold' } })
  })

  it('loads plotting metadata from analysis-result definitions', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    const definitions = {
      peakVal: {
        axis_label: 'Peak voltage (mV)',
        category: 'waveform',
        is_categorical: false,
        show_in_plot_menu: true,
      },
    }
    source.fetch = fetchJson(definitions) as LoadedSanPyCollection['fetch']
    await expect(loadAnalysisResultDefinitions(source, valid.members[0].recording, 'metadata/analysis_result_definitions.json')).resolves.toEqual(definitions)
  })

  it('rejects analysis-result definitions missing required plotting metadata', async () => {
    const source = await loadSanPyCollection('https://example.test/sample.sanpy.zarr/', fetchJson(valid))
    source.fetch = fetchJson({
      peakVal: { axis_label: 'Peak voltage (mV)', category: 'waveform', is_categorical: false },
    }) as LoadedSanPyCollection['fetch']
    await expect(loadAnalysisResultDefinitions(
      source,
      valid.members[0].recording,
      'metadata/analysis_result_definitions.json',
    )).rejects.toThrow('Invalid SanPy analysis-result definition "peakVal"')
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

const recordingPath = 'recordings/r1/recording.json'
const validRecording = {
  format: 'sanpy-zarr-recording',
  version: '1.0-draft',
  resources: {
    data: 'data.zarr',
    analysis_results: { rows: 0, representations: { csv: 'analysis_results.csv' } },
    experimental_metadata: 'metadata/experimental_metadata.json',
    experimental_metadata_definitions: 'metadata/experimental_metadata_definitions.json',
    file_metadata: 'metadata/file_metadata.json',
    file_metadata_definitions: 'metadata/file_metadata_definitions.json',
    detection_parameters: 'metadata/detection_parameters.json',
    detection_parameter_definitions: 'metadata/detection_parameter_definitions.json',
    analysis_result_definitions: 'metadata/analysis_result_definitions.json',
    trace_overlays: 'metadata/trace_overlays.json',
  },
}

function recordingSource(recording: unknown): LoadedSanPyCollection {
  return {
    root: new URL('https://example.test/sample.sanpy.zarr/'),
    fetch: fetchJson(recording) as LoadedSanPyCollection['fetch'],
    collection: valid as unknown as SanPyCollection,
  }
}

describe('loadSanPyRecording', () => {
  it('accepts a recording whose resource paths are relative', async () => {
    await expect(loadSanPyRecording(recordingSource(validRecording), recordingPath)).resolves.toMatchObject({
      format: 'sanpy-zarr-recording',
    })
  })

  it('names a missing recording resource', async () => {
    const resources = Object.fromEntries(Object.entries(validRecording.resources).filter(([key]) => key !== 'trace_overlays'))
    const recording = { ...validRecording, resources }
    await expect(loadSanPyRecording(recordingSource(recording), recordingPath)).rejects.toThrow(
      'Invalid SanPy Zarr recording resource "trace_overlays" in recordings/r1/recording.json: missing (expected a relative path)',
    )
  })

  it('names a non-relative recording resource path', async () => {
    const recording = { ...validRecording, resources: { ...validRecording.resources, data: '../secret' } }
    await expect(loadSanPyRecording(recordingSource(recording), recordingPath)).rejects.toThrow(
      'Invalid SanPy Zarr recording resource "data" in recordings/r1/recording.json: "../secret" (expected a relative path)',
    )
  })

  it('names an unsupported recording version', async () => {
    await expect(loadSanPyRecording(recordingSource({ ...validRecording, version: '1.0' }), recordingPath)).rejects.toThrow(
      'Unsupported SanPy Zarr recording version in recordings/r1/recording.json: found "1.0", expected "1.0-draft"',
    )
  })

  it('names an invalid analysis-results representation path', async () => {
    const recording = {
      ...validRecording,
      resources: {
        ...validRecording.resources,
        analysis_results: { rows: 0, representations: { csv: '/absolute.csv' } },
      },
    }
    await expect(loadSanPyRecording(recordingSource(recording), recordingPath)).rejects.toThrow(
      'Invalid SanPy Zarr table resource "csv" in recordings/r1/recording.json: "/absolute.csv" (expected a relative path)',
    )
  })
})
