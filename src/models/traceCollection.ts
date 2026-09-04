export const TRACE_COLLECTION_VERSION = '0.1'

export interface TraceCollectionMember {
  id: string
  name: string
  recording: string
  summary: {
    num_sweeps: number
    num_channels: number
    samples_per_sweep: number
    samples_per_second: number
    num_peaks: number
    protocol: string
    acquisition_datetime: string
  }
}

export interface TraceCollection {
  format: 'acqstore-trace-collection'
  version: '0.1'
  id: string
  name: string
  members: TraceCollectionMember[]
}

export interface TraceRecording {
  format: 'acqstore-trace-recording'
  version: '0.1'
  recording_id: string
  name: string
  dimensions: { sweeps: number; channels: number; samples: number }
  sampling: { rate_hz: number; time_unit: string }
  channels: Array<{ index: number; name: string; unit: string }>
  command_channels: Array<{ index: number; name: string; unit: string }>
  resources: {
    arrays: string
    epochs: TableResource
    source: string
    analysis?: string
  }
  display: { minmax_factors: number[]; signals: Array<'values' | 'commands'> }
}

export interface TableResource { media_type: string; path: string; rows: number }
export interface LegacyAnalysis {
  format: 'sanpy-legacy-analysis'
  version: 1
  recording_id: string
  peaks?: TableResource
}
export interface LoadedTraceCollection { root: URL; fetch: ResourceFetch; collection: TraceCollection }
export type ResourceFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
