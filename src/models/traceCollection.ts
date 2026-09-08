export type ResourceFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export const SANPY_ZARR_VERSION = '1.0-draft'

export interface SanPyCollectionMember {
  id: string
  name: string
  recording: string
  summary: {
    sweeps: number
    channels: number
    points: number
    sampling_rate_hz: number
    analysis_results: number
    protocol: string
    acquisition_datetime: string
  }
}

export interface SanPyCollection {
  format: 'sanpy-zarr'
  version: '1.0-draft'
  id: string
  name: string
  created_at: string
  members: SanPyCollectionMember[]
}

export interface SanPyTableResource {
  rows: number
  representations: { csv?: string; parquet?: string }
}

export interface SanPyRecording {
  format: 'sanpy-zarr-recording'
  version: '1.0-draft'
  id: string
  name: string
  dimensions: { sweeps: number; channels: number; points: number }
  sampling_rate_hz: number
  protocol: string
  acquisition_datetime: string
  channels: Array<{ index: number; name: string; unit: string; values_are_scaled?: true }>
  command_channels: Array<{ index: number; name: string; unit: string }>
  analysis_channel: number
  resources: {
    data: string
    analysis_results: SanPyTableResource
    sanpy_metadata: string
    detection_parameters: string
    analysis_result_definitions: string
    trace_overlays: string
  }
}

export interface TraceOverlayDefinition {
  id: string
  label: string
  x_result: string
  y_result: string
  point_id_result: string
  sweep_result: string
}

export interface TraceOverlayDocument { overlays: TraceOverlayDefinition[] }
export interface AnalysisResultDefinition { axis_label: string; category: string; [key: string]: unknown }
export type AnalysisResultDefinitions = Record<string, AnalysisResultDefinition>
export interface LoadedSanPyCollection { root: URL; fetch: ResourceFetch; collection: SanPyCollection }
