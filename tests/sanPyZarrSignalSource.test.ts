import { describe, expect, it } from 'vitest'
import { SanPyDerivativeSignalSource, SanPyZarrSignalSource } from '../src/data/sanPyZarrSignalSource'
import type { LoadedSanPyCollection, SanPyRecording } from '../src/models/traceCollection'

const collection = {
  root: new URL('https://example.test/sample.sanpy.zarr/'),
  fetch: fetch,
  collection: { format: 'sanpy-zarr', version: '1.0-draft', id: 'c', name: 'c', created_at: '', members: [] },
} satisfies LoadedSanPyCollection

const recording = {
  format: 'sanpy-zarr-recording', version: '1.0-draft', id: 'r1', name: 'one.abf',
  dimensions: { sweeps: 2, channels: 1, points: 100 }, sampling_rate_hz: 10000,
  protocol: '', acquisition_datetime: '', channels: [{ index: 0, name: 'Vm', unit: 'mV' }],
  command_channels: [{ index: 0, name: 'Command', unit: 'pA' }], analysis_channel: 0,
  resources: { data: 'data.zarr', analysis_results: { rows: 0, representations: { csv: 'analysis_results.csv' } }, sanpy_metadata: 'metadata/sanpy_metadata.json', detection_parameters: 'metadata/detection_parameters.json', trace_overlays: 'metadata/trace_overlays.json' },
} satisfies SanPyRecording

describe('SanPyZarrSignalSource', () => {
  it('describes native raw and command arrays', async () => {
    const source = new SanPyZarrSignalSource(collection, 'recordings/r1/recording.json', recording, { sweep: 0, channel: 0 })
    const description = await source.describe()
    expect(description.sampleCount).toBe(100)
    expect(description.series.map(({ id }) => id)).toEqual(['raw', 'command'])
    expect(description.xStep).toBe(0.0001)
  })

  it('offers derivative instead of command on the right axis', async () => {
    const source = new SanPyZarrSignalSource(collection, 'recordings/r1/recording.json', recording, { sweep: 0, channel: 0 }, 'derivative')
    const description = await source.describe()
    expect(description.yAxes.right).toEqual({ label: 'Derivative', unit: 'mV/ms' })
    expect(description.series.map(({ id }) => id)).toEqual(['raw', 'dvdt'])
  })
})

describe('SanPyDerivativeSignalSource', () => {
  it('reserves an empty right axis so stacked plot areas align', async () => {
    const source = new SanPyDerivativeSignalSource(collection, 'recordings/r/recording.json', recording, { sweep: 0, channel: 0 })
    const description = await source.describe()
    expect(description.yAxes.right).toEqual({ label: '', unit: '' })
    expect(description.series.every((series) => series.yAxis !== 'right')).toBe(true)
  })
})
