import * as zarr from 'zarrita'
import type {
  SignalDescription,
  SignalRangeRequest,
  SignalRangeResult,
  SignalSeriesResult,
  SignalSource,
} from '@mapmanager/signal-viewer'
import type { LoadedSanPyCollection, SanPyRecording } from '../models/traceCollection'

export interface TraceSelection { sweep: number; channel: number }

export class SanPyZarrSignalSource implements SignalSource {
  readonly recording: SanPyRecording
  readonly selection: TraceSelection
  readonly #root: URL
  readonly #fetch: LoadedSanPyCollection['fetch']

  constructor(collection: LoadedSanPyCollection, recordingPath: string, recording: SanPyRecording, selection: TraceSelection) {
    this.recording = recording
    this.selection = selection
    this.#root = new URL(`${recording.resources.data.replace(/\/$/, '')}/`, new URL(recordingPath, collection.root))
    this.#fetch = collection.fetch
  }

  async describe(): Promise<SignalDescription> {
    const channel = this.recording.channels[this.selection.channel]!
    const command = this.recording.command_channels[this.selection.channel]
    return {
      id: `${this.recording.id}:${this.selection.sweep}:${this.selection.channel}`,
      sampleCount: this.recording.dimensions.points,
      xStart: 0,
      xStep: 1 / this.recording.sampling_rate_hz,
      xLabel: 'Time',
      xUnit: 's',
      yAxes: {
        left: { label: channel.name, unit: channel.unit },
        ...(command ? { right: { label: command.name, unit: command.unit } } : {}),
      },
      series: [
        { id: 'raw', label: channel.name, yAxis: 'left', style: { color: '#62d9ff', lineWidth: 1.5 } },
        ...(command ? [{ id: 'command', label: command.name, yAxis: 'right' as const, style: { color: '#ff9f43', lineWidth: 1.25 } }] : []),
      ],
    }
  }

  async getRange(request: SignalRangeRequest): Promise<SignalRangeResult> {
    const series = await Promise.all(request.seriesIds.map((id) => this.#readSeries(id, request)))
    return { startSample: request.startSample, stopSample: request.stopSample, series }
  }

  async #readSeries(id: string, request: SignalRangeRequest): Promise<SignalSeriesResult> {
    if (id !== 'raw' && id !== 'command') throw new Error(`Unknown trace series: ${id}`)
    const store = new zarr.FetchStore(this.#root, { fetch: (resource) => this.#fetch(resource) })
    const array = await zarr.open(zarr.root(store).resolve(id), { kind: 'array', signal: request.signal })
    const chunk = await zarr.get(
      array,
      [this.selection.sweep, this.selection.channel, zarr.slice(request.startSample, request.stopSample)],
      { signal: request.signal },
    )
    return { id, kind: 'samples', values: chunk.data as Float32Array | Float64Array }
  }
}

export class SanPyDerivativeSignalSource implements SignalSource {
  readonly #recording: SanPyRecording
  readonly #selection: TraceSelection
  readonly #root: URL
  readonly #fetch: LoadedSanPyCollection['fetch']

  constructor(collection: LoadedSanPyCollection, recordingPath: string, recording: SanPyRecording, selection: TraceSelection) {
    this.#recording = recording
    this.#selection = selection
    this.#root = new URL(`${recording.resources.data.replace(/\/$/, '')}/`, new URL(recordingPath, collection.root))
    this.#fetch = collection.fetch
  }

  async describe(): Promise<SignalDescription> {
    const channel = this.#recording.channels[this.#selection.channel]!
    return {
      id: `${this.#recording.id}:${this.#selection.sweep}:dvdt`,
      sampleCount: this.#recording.dimensions.points,
      xStart: 0,
      xStep: 1 / this.#recording.sampling_rate_hz,
      xLabel: 'Time',
      xUnit: 's',
      yAxes: { left: { label: 'Derivative', unit: `${channel.unit}/ms` } },
      series: [{ id: 'dvdt', label: `d${channel.name}/dt`, yAxis: 'left', style: { color: '#a78bfa', lineWidth: 1.25 } }],
    }
  }

  async getRange(request: SignalRangeRequest): Promise<SignalRangeResult> {
    const store = new zarr.FetchStore(this.#root, { fetch: (resource) => this.#fetch(resource) })
    const array = await zarr.open(zarr.root(store).resolve('dvdt'), { kind: 'array', signal: request.signal })
    const chunk = await zarr.get(
      array,
      [this.#selection.sweep, zarr.slice(request.startSample, request.stopSample)],
      { signal: request.signal },
    )
    return {
      startSample: request.startSample,
      stopSample: request.stopSample,
      series: [{ id: 'dvdt', kind: 'samples', values: chunk.data as Float32Array | Float64Array }],
    }
  }
}
